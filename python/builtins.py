import sys
import json

builtin_modules = {}

for module_name in sys.builtin_module_names:
    if module_name in ('__builtin__', '__main__'):
        continue

    builtin_modules[module_name] = dir(__import__(module_name))

print(json.dumps(builtin_modules))