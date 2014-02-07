import sys
import json

print(json.dumps(filter(None, sys.path)))