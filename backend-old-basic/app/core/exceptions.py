"""
Exceções customizadas do sistema
"""

from fastapi import HTTPException, status


class AppException(HTTPException):
    """Exceção base da aplicação"""

    def __init__(self, status_code: int, detail: str, code: str = None, headers: dict = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code


class NotFoundError(AppException):
    """Recurso não encontrado"""

    def __init__(self, detail: str = "Recurso não encontrado", code: str = "NOT_FOUND"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code=code)


class BadRequestError(AppException):
    """Requisição inválida"""

    def __init__(self, detail: str = "Requisição inválida", code: str = "BAD_REQUEST"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail, code=code)


class UnauthorizedError(AppException):
    """Não autorizado"""

    def __init__(self, detail: str = "Não autorizado", code: str = "UNAUTHORIZED"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, code=code, headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(AppException):
    """Acesso proibido"""

    def __init__(self, detail: str = "Acesso proibido", code: str = "FORBIDDEN"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail, code=code)


class ConflictError(AppException):
    """Conflito"""

    def __init__(self, detail: str = "Conflito", code: str = "CONFLICT"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code=code)


class BusinessError(BadRequestError):
    """Erro de regra de negócio"""

    pass


class DuplicateError(ConflictError):
    """Registro duplicado"""

    def __init__(self, detail: str = "Registro já existe", code: str = "DUPLICATE"):
        super().__init__(detail=detail, code=code)


class ValidationError(BadRequestError):
    """Erro de validação"""

    def __init__(self, detail: str = "Erro de validação", code: str = "VALIDATION_ERROR"):
        super().__init__(detail=detail, code=code)
