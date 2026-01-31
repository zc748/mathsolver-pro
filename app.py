from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sympy as sp
from sympy import *
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
import numpy as np
import json
import traceback

app = Flask(__name__, static_folder='static')
CORS(app)

# Configure SymPy
x, y, z, t, n = symbols('x y z t n')
sp.init_printing(use_unicode=True)

def safe_parse(expression_str):
    """Safely parse mathematical expressions"""
    try:
        transformations = (standard_transformations + (implicit_multiplication_application,))
        expr = parse_expr(expression_str, transformations=transformations, local_dict={'e': sp.E, 'pi': sp.pi})
        return expr
    except Exception as e:
        raise ValueError(f"Could not parse expression: {str(e)}")

def format_latex(expr):
    """Convert SymPy expression to LaTeX"""
    return sp.latex(expr)

def get_steps(operation, expr, **kwargs):
    """Generate step-by-step solutions"""
    steps = []
    
    if operation == 'derivative':
        var = kwargs.get('variable', x)
        steps.append({
            'step': 'Original Expression',
            'expression': format_latex(expr),
            'explanation': f'We need to find the derivative of this expression with respect to {var}'
        })
        
        # Apply derivative rules
        result = sp.diff(expr, var)
        steps.append({
            'step': 'Apply Derivative Rules',
            'expression': format_latex(result),
            'explanation': 'Using the power rule, chain rule, and product rule as needed'
        })
        
        # Simplify
        simplified = sp.simplify(result)
        if simplified != result:
            steps.append({
                'step': 'Simplify',
                'expression': format_latex(simplified),
                'explanation': 'Combine like terms and simplify the result'
            })
    
    elif operation == 'integral':
        var = kwargs.get('variable', x)
        steps.append({
            'step': 'Original Expression',
            'expression': format_latex(expr),
            'explanation': f'We need to find the integral of this expression with respect to {var}'
        })
        
        result = sp.integrate(expr, var)
        steps.append({
            'step': 'Apply Integration Rules',
            'expression': format_latex(result) + ' + C',
            'explanation': 'Using substitution, integration by parts, or standard formulas. Don\'t forget the constant of integration C'
        })
    
    elif operation == 'limit':
        var = kwargs.get('variable', x)
        point = kwargs.get('point', 0)
        steps.append({
            'step': 'Original Expression',
            'expression': format_latex(expr),
            'explanation': f'We need to find the limit as {var} approaches {point}'
        })
        
        result = sp.limit(expr, var, point)
        steps.append({
            'step': 'Evaluate Limit',
            'expression': format_latex(result),
            'explanation': 'Direct substitution or L\'Hôpital\'s rule if indeterminate'
        })
    
    elif operation == 'simplify':
        steps.append({
            'step': 'Original Expression',
            'expression': format_latex(expr),
            'explanation': 'We need to simplify this expression'
        })
        
        expanded = sp.expand(expr)
        if expanded != expr:
            steps.append({
                'step': 'Expand',
                'expression': format_latex(expanded),
                'explanation': 'Expand all products and powers'
            })
        
        result = sp.simplify(expr)
        steps.append({
            'step': 'Simplify',
            'expression': format_latex(result),
            'explanation': 'Combine like terms and reduce to simplest form'
        })
        
        factored = sp.factor(result)
        if factored != result:
            steps.append({
                'step': 'Factor',
                'expression': format_latex(factored),
                'explanation': 'Factor the expression if possible'
            })
    
    return steps

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        operation = data.get('operation')
        expression_str = data.get('expression')
        
        if not expression_str:
            return jsonify({'error': 'No expression provided'}), 400
        
        # Parse expression
        expr = safe_parse(expression_str)
        
        result = None
        steps = []
        graph_data = None
        
        if operation == 'derivative':
            var_str = data.get('variable', 'x')
            var = symbols(var_str)
            result = sp.diff(expr, var)
            steps = get_steps('derivative', expr, variable=var)
            
            # Generate graph data
            try:
                f = sp.lambdify(var, expr, 'numpy')
                f_prime = sp.lambdify(var, result, 'numpy')
                x_vals = np.linspace(-10, 10, 200)
                y_vals = f(x_vals)
                y_prime_vals = f_prime(x_vals)
                
                # Filter out invalid values
                mask = np.isfinite(y_vals) & np.isfinite(y_prime_vals)
                
                graph_data = {
                    'original': {
                        'x': x_vals[mask].tolist(),
                        'y': y_vals[mask].tolist(),
                        'label': 'f(x)'
                    },
                    'derivative': {
                        'x': x_vals[mask].tolist(),
                        'y': y_prime_vals[mask].tolist(),
                        'label': "f'(x)"
                    }
                }
            except:
                pass
        
        elif operation == 'integral':
            var_str = data.get('variable', 'x')
            var = symbols(var_str)
            
            if data.get('definite'):
                lower = safe_parse(str(data.get('lower', 0)))
                upper = safe_parse(str(data.get('upper', 1)))
                result = sp.integrate(expr, (var, lower, upper))
                steps = get_steps('integral', expr, variable=var)
                steps.append({
                    'step': 'Evaluate Definite Integral',
                    'expression': format_latex(result),
                    'explanation': f'Evaluate from {lower} to {upper}'
                })
            else:
                result = sp.integrate(expr, var)
                steps = get_steps('integral', expr, variable=var)
            
            # Generate graph data
            try:
                f = sp.lambdify(var, expr, 'numpy')
                x_vals = np.linspace(-10, 10, 200)
                y_vals = f(x_vals)
                mask = np.isfinite(y_vals)
                
                graph_data = {
                    'function': {
                        'x': x_vals[mask].tolist(),
                        'y': y_vals[mask].tolist(),
                        'label': 'f(x)'
                    }
                }
            except:
                pass
        
        elif operation == 'limit':
            var_str = data.get('variable', 'x')
            var = symbols(var_str)
            point = data.get('point', 0)
            direction = data.get('direction', '+-')
            
            if direction == '+':
                result = sp.limit(expr, var, point, '+')
            elif direction == '-':
                result = sp.limit(expr, var, point, '-')
            else:
                result = sp.limit(expr, var, point)
            
            steps = get_steps('limit', expr, variable=var, point=point)
        
        elif operation == 'solve':
            var_str = data.get('variable', 'x')
            var = symbols(var_str)
            solutions = sp.solve(expr, var)
            
            steps.append({
                'step': 'Original Equation',
                'expression': format_latex(expr) + ' = 0',
                'explanation': 'We need to solve this equation for ' + var_str
            })
            
            steps.append({
                'step': 'Solutions',
                'expression': ', '.join([format_latex(sol) for sol in solutions]),
                'explanation': f'Found {len(solutions)} solution(s)'
            })
            
            result = solutions
        
        elif operation == 'simplify':
            result = sp.simplify(expr)
            steps = get_steps('simplify', expr)
        
        elif operation == 'expand':
            result = sp.expand(expr)
            steps.append({
                'step': 'Original Expression',
                'expression': format_latex(expr),
                'explanation': 'Expand all products and powers'
            })
            steps.append({
                'step': 'Expanded Form',
                'expression': format_latex(result),
                'explanation': 'All terms expanded'
            })
        
        elif operation == 'factor':
            result = sp.factor(expr)
            steps.append({
                'step': 'Original Expression',
                'expression': format_latex(expr),
                'explanation': 'Factor the expression'
            })
            steps.append({
                'step': 'Factored Form',
                'expression': format_latex(result),
                'explanation': 'Expression in factored form'
            })
        
        elif operation == 'series':
            var_str = data.get('variable', 'x')
            var = symbols(var_str)
            point = data.get('point', 0)
            n_terms = data.get('terms', 6)
            
            result = sp.series(expr, var, point, n_terms)
            steps.append({
                'step': 'Taylor Series Expansion',
                'expression': format_latex(result),
                'explanation': f'Expanded around x = {point} up to {n_terms} terms'
            })
        
        else:
            return jsonify({'error': 'Unknown operation'}), 400
        
        # Format result
        if isinstance(result, list):
            result_latex = [format_latex(r) for r in result]
        else:
            result_latex = format_latex(result)
        
        return jsonify({
            'result': result_latex,
            'steps': steps,
            'graph': graph_data
        })
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

@app.route('/api/graph', methods=['POST'])
def graph():
    try:
        data = request.json
        expression_str = data.get('expression')
        var_str = data.get('variable', 'x')
        x_min = data.get('xMin', -10)
        x_max = data.get('xMax', 10)
        
        expr = safe_parse(expression_str)
        var = symbols(var_str)
        
        f = sp.lambdify(var, expr, 'numpy')
        x_vals = np.linspace(x_min, x_max, 500)
        y_vals = f(x_vals)
        
        # Filter out invalid values
        mask = np.isfinite(y_vals)
        
        return jsonify({
            'x': x_vals[mask].tolist(),
            'y': y_vals[mask].tolist()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/practice', methods=['POST'])
def generate_practice():
    try:
        data = request.json
        topic = data.get('topic', 'derivative')
        difficulty = data.get('difficulty', 'medium')
        
        problems = []
        
        if topic == 'derivative':
            if difficulty == 'easy':
                expressions = [
                    'x**2 + 3*x + 1',
                    'sin(x)',
                    'cos(x)',
                    '5*x**3',
                    'exp(x)'
                ]
            elif difficulty == 'medium':
                expressions = [
                    'x**3 * sin(x)',
                    'exp(x) * cos(x)',
                    'ln(x**2 + 1)',
                    '(x**2 + 1)/(x - 1)',
                    'tan(x**2)'
                ]
            else:  # hard
                expressions = [
                    'x**x',
                    'sin(x)/x',
                    'exp(sin(x**2))',
                    'ln(cos(x) + sin(x))',
                    '(x**2 + 1)**(1/3)'
                ]
        
        elif topic == 'integral':
            if difficulty == 'easy':
                expressions = [
                    'x**2',
                    'sin(x)',
                    '5*x',
                    'exp(x)',
                    '1/x'
                ]
            elif difficulty == 'medium':
                expressions = [
                    'x * exp(x)',
                    'x * sin(x)',
                    'sin(x)**2',
                    '1/(x**2 + 1)',
                    'sqrt(x)'
                ]
            else:  # hard
                expressions = [
                    'x**2 * exp(x)',
                    'sin(x) * cos(x)',
                    'x / (x**2 + 1)',
                    'exp(x) * sin(x)',
                    'ln(x) / x'
                ]
        
        for expr_str in expressions[:5]:
            expr = safe_parse(expr_str)
            
            if topic == 'derivative':
                solution = sp.diff(expr, x)
            else:
                solution = sp.integrate(expr, x)
            
            problems.append({
                'problem': format_latex(expr),
                'solution': format_latex(solution),
                'hint': f'Try using the {topic} rules you know'
            })
        
        return jsonify({'problems': problems})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
