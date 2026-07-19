import json
from datetime import datetime, date
from decimal import Decimal
from fastapi.responses import JSONResponse as _JSONResponse


class _CustomEncoder(json.JSONEncoder):
    """
    Extends the default JSON encoder to handle types that
    PostgreSQL returns but standard json.dumps cannot serialize:
      - datetime  → ISO 8601 string e.g. "2024-03-15T10:30:00"
      - date      → ISO 8601 string e.g. "2024-03-15"
      - Decimal   → float (psycopg2 returns NUMERIC as Decimal)
    """
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _jsonify(data) -> str:
    return json.dumps(data, cls=_CustomEncoder)


def success_response(data=None, message: str = None, status_code: int = 200):
    content = {"success": True, "data": data, "message": message, "error": None}
    return _JSONResponse(
        content=json.loads(_jsonify(content)),
        status_code=status_code,
    )


def error_response(message: str, status_code: int = 400):
    content = {"success": False, "data": None, "message": None, "error": message}
    return _JSONResponse(content=content, status_code=status_code)