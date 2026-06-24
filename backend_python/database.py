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

class CommunityOfficer(Base):
    __tablename__ = "community_officers"
    
    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String(150), nullable=False)
    name_mr = Column(String(150), nullable=False)
    role_en = Column(String(150), nullable=False)
    role_mr = Column(String(150), nullable=False)
    region_en = Column(String(150), nullable=False)
    region_mr = Column(String(150), nullable=False)
    contact = Column(String(50), nullable=False)

class CommunityWebinar(Base):
    __tablename__ = "community_webinars"
    
    id = Column(Integer, primary_key=True, index=True)
    topic_en = Column(String(250), nullable=False)
    topic_mr = Column(String(250), nullable=False)
    date_en = Column(String(100), nullable=False)
    date_mr = Column(String(100), nullable=False)
    link = Column(String(250), nullable=False)

class GovernmentScheme(Base):
    __tablename__ = "government_schemes"
    
    id = Column(Integer, primary_key=True, index=True)
    title_en = Column(String(250), nullable=False)
    title_mr = Column(String(250), nullable=False)
    desc_en = Column(Text, nullable=False)
    desc_mr = Column(Text, nullable=False)
    url = Column(String(250), nullable=False)

# Database initialization helper
def init_db():
    Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()
    try:
        # Seed Officers
        if db.query(CommunityOfficer).count() == 0:
            officers = [
                CommunityOfficer(
                    name_en="Dr. Ramesh Patil", name_mr="डॉ. रमेश पाटील",
                    role_en="Senior District Agronomist", role_mr="वरिष्ठ जिल्हा कृषी तज्ज्ञ",
                    region_en="Pune Region", region_mr="पुणे विभाग",
                    contact="+91 98765 01234"
                ),
                CommunityOfficer(
                    name_en="Mrs. Savita Shinde", name_mr="श्रीमती सविता शिंदे",
                    role_en="Block Agriculture Officer", role_mr="तालुका कृषी अधिकारी",
                    region_en="Nashik Block", region_mr="नाशिक तालुका",
                    contact="+91 98765 05678"
                ),
                CommunityOfficer(
                    name_en="Dr. Anil Deshmukh", name_mr="डॉ. अनिल देशमुख",
                    role_en="Soil Health Specialist", role_mr="मृदा आरोग्य शास्त्रज्ञ",
                    region_en="Nagpur District", region_mr="नागपूर जिल्हा",
                    contact="+91 98765 09012"
                ),
                CommunityOfficer(
                    name_en="Mr. Vijay Kakade", name_mr="श्री. विजय काकडे",
                    role_en="Horticulture Advisor", role_mr="फलोत्पादन सल्लागार",
                    region_en="Jalgaon Block", region_mr="जळगाव तालुका",
                    contact="+91 98765 03456"
                )
            ]
            db.bulk_save_objects(officers)
            db.commit()
            print("[Database] Seeded default community officers.")

        # Seed Webinars
        if db.query(CommunityWebinar).count() == 0:
            webinars = [
                CommunityWebinar(
                    topic_en="Kharif Soil Management & Fertilizer Optimization",
                    topic_mr="खरीप जमीन व्यवस्थापन आणि खत नियोजन",
                    date_en="June 18, 2026 - 11:00 AM",
                    date_mr="१८ जून, २०२६ - सकाळी ११:०० वाजता",
                    link="https://meet.google.com/abc-defg-hij"
                ),
                CommunityWebinar(
                    topic_en="Drip Irrigation Setup & Subsidy Application Guidance",
                    topic_mr="ठिबक सिंचन उभारणी आणि अनुदान अर्ज मार्गदर्शन",
                    date_en="June 25, 2026 - 03:00 PM",
                    date_mr="२५ जून, २०२६ - दुपारी ०३:०० वाजता",
                    link="https://meet.google.com/xyz-uvwx-yza"
                ),
                CommunityWebinar(
                    topic_en="Post-Harvest Storage & Cold Chain Management",
                    topic_mr="काढणीपश्चात साठवणूक आणि शीत साखळी व्यवस्थापन",
                    date_en="July 02, 2026 - 04:00 PM",
                    date_mr="०२ जुलै, २०२६ - दुपारी ०४:०० वाजता",
                    link="https://meet.google.com/qwe-rtyu-iop"
                )
            ]
            db.bulk_save_objects(webinars)
            db.commit()
            print("[Database] Seeded default community webinars.")

        # Seed Schemes
        if db.query(GovernmentScheme).count() == 0:
            schemes = [
                GovernmentScheme(
                    title_en="Pradhan Mantri Fasal Bima Yojana (PMFBY) - Crop Insurance",
                    title_mr="प्रधानमंत्री पीक विमा योजना (PMFBY)",
                    desc_en="Protect your crops against natural calamities with subsidized insurance.",
                    desc_mr="नैसर्गिक आपत्तींपासून पीक संरक्षणासाठी सवलतीच्या दरात विमा मिळवा.",
                    url="https://pmfby.gov.in"
                ),
                GovernmentScheme(
                    title_en="Mahadbt Farmer Portal - Maharashtra Subsidies",
                    title_mr="महाडीबीटी शेतकरी पोर्टल - योजना व अनुदान",
                    desc_en="One-stop shop for Maharashtra agriculture subsidies and equipment application.",
                    desc_mr="महाराष्ट्र कृषी अनुदान आणि अवजारे अर्जासाठी मुख्य दालन.",
                    url="https://mahadbt.maharashtra.gov.in"
                ),
                GovernmentScheme(
                    title_en="PM Kisan Samman Nidhi",
                    title_mr="पीएम किसान सन्मान निधी",
                    desc_en="Direct income support of ₹6,000 per year to landholding farmer families.",
                    desc_mr="शेतकरी कुटुंबांना वर्षाला ₹६,००० थेट बँक खात्यात मदत.",
                    url="https://pmkisan.gov.in"
                )
            ]
            db.bulk_save_objects(schemes)
            db.commit()
            print("[Database] Seeded default government schemes.")
            
    except Exception as e:
        print("[Database] Seeding error:", e)
        db.rollback()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
