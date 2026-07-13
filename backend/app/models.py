import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    LEARNER = "learner"
    TUTOR   = "tutor"
    ADMIN   = "admin"


class EnvironmentStatus(str, enum.Enum):
    PENDING      = "pending"
    PROVISIONING = "provisioning"
    RUNNING      = "running"
    DESTROYING   = "destroying"
    DESTROYED    = "destroyed"
    ERROR        = "error"


class Category(Base):
    __tablename__ = "categories"
    id          = Column(String(36),  primary_key=True, default=gen_uuid)
    slug        = Column(String(64),  unique=True, nullable=False)
    name        = Column(String(128), nullable=False)
    color       = Column(String(32),  default="coral")
    description = Column(Text,        nullable=True)
    sort_order  = Column(Integer,     default=0)


class Difficulty(Base):
    __tablename__ = "difficulties"
    id         = Column(String(36),  primary_key=True, default=gen_uuid)
    slug       = Column(String(64),  unique=True, nullable=False)
    name       = Column(String(128), nullable=False)
    sort_order = Column(Integer,     default=0)


class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    id                       = Column(String(36),  primary_key=True, default=lambda: "singleton")
    platform_name            = Column(String(256), default="Cyber Range Platform")
    default_points           = Column(Integer,     default=100)
    default_time_limit_minutes = Column(Integer,   default=90)
    hint_penalties_enabled   = Column(Boolean,     default=True)
    provisioning_backend     = Column(String(64),  default="simulate")


class User(Base):
    __tablename__ = "users"
    id              = Column(String(36),  primary_key=True, default=gen_uuid)
    name            = Column(String(256), nullable=False)
    email           = Column(String(256), unique=True, nullable=False, index=True)
    institution     = Column(String(256), nullable=True)
    hashed_password = Column(String(256), nullable=False)
    role            = Column(Enum(Role),  default=Role.LEARNER, nullable=False)
    points          = Column(Integer,     default=0)
    is_active       = Column(Boolean,     default=True)
    created_at      = Column(DateTime,    default=datetime.utcnow)

    submissions  = relationship("FlagSubmission", back_populates="user")
    environments = relationship("Environment",    back_populates="user")


class Room(Base):
    """
    A Room groups several challenges into a themed lab (TryHackMe-style).
    Rooms have a category (offensive/defensive/mitigation/risk) and a
    lab_layer that indicates the ICS technology stack being practised.
    """
    __tablename__ = "rooms"
    id          = Column(String(36),  primary_key=True, default=gen_uuid)
    slug        = Column(String(128), unique=True, nullable=False)
    title       = Column(String(256), nullable=False)
    description = Column(Text,        nullable=True)
    category_id = Column(String(36),  ForeignKey("categories.id"), nullable=False)
    lab_layer   = Column(String(64),  nullable=True)   # plc | scada | icsim | wazuh | risk
    module      = Column(String(128), nullable=True)   # e.g. "Accidental Risk", "Environmental Risk"
    difficulty  = Column(String(32),  default="medium") # easy | medium | hard
    image_url   = Column(String(512), nullable=True)
    is_published = Column(Boolean,    default=False)
    sort_order  = Column(Integer,     default=0)
    created_at  = Column(DateTime,    default=datetime.utcnow)

    category   = relationship("Category")
    challenges = relationship("RoomChallenge", back_populates="room",
                              order_by="RoomChallenge.order", cascade="all, delete-orphan")


class RoomChallenge(Base):
    """Ordered many-to-many: a challenge can live in one room at a specific order position."""
    __tablename__ = "room_challenges"
    id           = Column(String(36), primary_key=True, default=gen_uuid)
    room_id      = Column(String(36), ForeignKey("rooms.id"),      nullable=False)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    order        = Column(Integer,    default=0)

    room      = relationship("Room",      back_populates="challenges")
    challenge = relationship("Challenge")


class VMTemplate(Base):
    __tablename__ = "vm_templates"
    id                  = Column(String(36),  primary_key=True, default=gen_uuid)
    name                = Column(String(256), nullable=False)
    description         = Column(Text,        nullable=True)
    zone                = Column(String(128), nullable=False)
    proxmox_template_id = Column(Integer,     nullable=False)
    default_tools       = Column(Text,        nullable=True)


class Challenge(Base):
    __tablename__ = "challenges"
    id               = Column(String(36),  primary_key=True, default=gen_uuid)
    title            = Column(String(256), nullable=False)
    description      = Column(Text,        nullable=False)
    objectives       = Column(Text,        nullable=True)
    category_id      = Column(String(36),  ForeignKey("categories.id"),  nullable=False)
    difficulty_id    = Column(String(36),  ForeignKey("difficulties.id"), nullable=False)
    challenge_type   = Column(String(64),  default="standard_flag")
    points           = Column(Integer,     default=100)
    time_limit_minutes = Column(Integer,   default=90)
    tags             = Column(String(512), nullable=True)
    lab_layer        = Column(String(64),  nullable=True)   # plc | scada | icsim | wazuh | risk
    flag_hash        = Column(String(256), nullable=False)
    is_published     = Column(Boolean,     default=False)
    created_by       = Column(String(36),  ForeignKey("users.id"), nullable=True)
    created_at       = Column(DateTime,    default=datetime.utcnow)

    category   = relationship("Category")
    difficulty = relationship("Difficulty")
    vms        = relationship("ChallengeVM",  back_populates="challenge", cascade="all, delete-orphan")
    hints      = relationship("Hint",         back_populates="challenge", cascade="all, delete-orphan")


class ChallengeVM(Base):
    __tablename__ = "challenge_vms"
    id             = Column(String(36), primary_key=True, default=gen_uuid)
    challenge_id   = Column(String(36), ForeignKey("challenges.id"),   nullable=False)
    vm_template_id = Column(String(36), ForeignKey("vm_templates.id"), nullable=False)
    canvas_x       = Column(Float,      default=0)
    canvas_y       = Column(Float,      default=0)

    challenge   = relationship("Challenge",  back_populates="vms")
    vm_template = relationship("VMTemplate")


class Hint(Base):
    __tablename__ = "hints"
    id           = Column(String(36), primary_key=True, default=gen_uuid)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    content      = Column(Text,       nullable=False)
    cost         = Column(Integer,    default=10)
    order        = Column(Integer,    default=0)

    challenge = relationship("Challenge", back_populates="hints")


class Environment(Base):
    __tablename__ = "environments"
    id           = Column(String(36),  primary_key=True, default=gen_uuid)
    user_id      = Column(String(36),  ForeignKey("users.id"),      nullable=False)
    challenge_id = Column(String(36),  ForeignKey("challenges.id"), nullable=False)
    status       = Column(Enum(EnvironmentStatus), default=EnvironmentStatus.PENDING)
    topology_json = Column(Text,       nullable=True)
    started_at   = Column(DateTime,    nullable=True)
    expires_at   = Column(DateTime,    nullable=True)
    destroyed_at = Column(DateTime,    nullable=True)
    hints_used   = Column(Integer,     default=0)

    user      = relationship("User",      back_populates="environments")
    challenge = relationship("Challenge")
    vms       = relationship("EnvironmentVM", back_populates="environment", cascade="all, delete-orphan")


class EnvironmentVM(Base):
    __tablename__ = "environment_vms"
    id             = Column(String(36),  primary_key=True, default=gen_uuid)
    environment_id = Column(String(36),  ForeignKey("environments.id"),  nullable=False)
    vm_template_id = Column(String(36),  ForeignKey("vm_templates.id"),  nullable=False)
    proxmox_vmid   = Column(Integer,     nullable=True)
    proxmox_node   = Column(String(128), nullable=True)
    ip_address     = Column(String(64),  nullable=True)
    status         = Column(String(32),  default="pending")

    environment = relationship("Environment", back_populates="vms")
    vm_template = relationship("VMTemplate")


class FlagSubmission(Base):
    __tablename__ = "flag_submissions"
    id              = Column(String(36),  primary_key=True, default=gen_uuid)
    user_id         = Column(String(36),  ForeignKey("users.id"),      nullable=False)
    challenge_id    = Column(String(36),  ForeignKey("challenges.id"), nullable=False)
    submitted_value = Column(String(512), nullable=False)
    is_correct      = Column(Boolean,     default=False)
    points_awarded  = Column(Integer,     default=0)
    created_at      = Column(DateTime,    default=datetime.utcnow)

    user      = relationship("User",      back_populates="submissions")
    challenge = relationship("Challenge")
