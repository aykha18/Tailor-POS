import ast
try:
    s=open('app.py','r',encoding='utf-8').read()
    ast.parse(s)
    print('PARSE_OK')
except SyntaxError as e:
    print('SyntaxError:', e)
    print('Line:', e.lineno, 'Offset:', e.offset)
