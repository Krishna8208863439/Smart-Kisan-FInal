import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Fetch database URL from environment or fallback to SQLite for local development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./smart_kisan.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="farmer") # farmer, expert, vet
    created_at = Column(DateTime, default=datetime.utcnow)

class CropLog(Base):
    __tablename__ = "crop_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True) # Optional link to user table
    crop_name = Column(String(100), nullable=False)
    soil_type = Column(String(50), nullable=False)
    region = Column(String(100), nullable=False)
    season = Column(String(50), nullable=False)
    pH = Column(Float, nullable=False)
    n_level = Column(Integer, nullable=False)
    p_level = Column(Integer, nullable=False)
    k_level = Column(Integer, nullable=False)
    expected_yield = Column(String(100))
    estimated_profit = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

class DiseaseReport(Base):
    __tablename__ = "disease_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    crop = Column(String(100), nullable=False)
    disease = Column(String(150), nullable=False)
    severity = Column(String(20), nullable=False) # low, medium, high
    confidence = Column(Float, nullable=False)
    advice = Column(Text, nullable=False)
    image_url = Column(String(250))
    region = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WeatherCache(Base):
    __tablename__ = "weather_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    display_name = Column(String(200))
    temperature = Column(Float)
    humidity = Column(Float)
    forecast_data = Column(Text) # JSON serialized string
    updated_at = Column(DateTime, default=datetime.utcnow)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(100), nullable=False)
    token = Column(String(250), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    region = Column(String(100), nullable=False)
    disease = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="high") # high, critical
    created_at = Column(DateTime, default=datetime.utcnow)

# Database initialization helper
def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
