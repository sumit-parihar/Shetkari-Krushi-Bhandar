from fastapi.responses import JSONResponse


def success_response(data=None, message=None, status_code=200):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "data": data,
            "message": message,
            "error": None
        }
    )


def error_response(message="Something went wrong", status_code=500):
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "data": None,
            "message": message,
            "error": message
        }
    )