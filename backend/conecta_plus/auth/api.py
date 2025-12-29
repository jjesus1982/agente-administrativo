"""
Authentication API Router for Conecta Plus
Integrates auth endpoints from the original backend
"""
from fastapi import APIRouter

# Import the auth and profile routes
from .auth import router as auth_router
from .profile import router as profile_router

# Create the main auth router
router = APIRouter()

# Include sub-routers with proper prefixes to match frontend expectations
router.include_router(auth_router, prefix="/v1/auth", tags=["authentication"])
router.include_router(profile_router, prefix="/v1/profile", tags=["profile"])