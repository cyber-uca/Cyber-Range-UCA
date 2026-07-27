"""
AutoRange Cyber Range — Data Model
===================================
Hierarchy: Path → Module → Room → Task → Question
           Question → QuestionOption | QuestionHint
Progress:  UserQuestionAnswer → UserTaskProgress → UserRoomProgress
           → UserModuleProgress → UserPathProgress
Infrastructure: VMTemplate → RoomVMTemplate
                Environment → EnvironmentVM  (linked to Room, not Question)
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import relationship

from .database import Base


# ── helpers ────────────────────────────────────────────────────────────────
def gen_uuid():
    return str(uuid.uuid4())


# ── enums ───────────────────────────────────────────────────────────────────

class Role(str, enum.Enum):
    LEARNER = "learner"
    TUTOR   = "tutor"
    ADMIN   = "admin"


class EnvironmentStatus(str, enum.Enum):
    PENDING      = "pending"
    PROVISIONING = "provisioning"
    RUNNING      = "running"
    PAUSED       = "paused"
    DESTROYING   = "destroying"
    DESTROYED    = "destroyed"
    ERROR        = "error"


class QuestionType(str, enum.Enum):
    FLAG             = "flag"               # submit FLAG{...} or ANSWER_X
    MCQ_SINGLE       = "mcq_single"         # single correct option
    MCQ_MULTI        = "mcq_multi"          # multiple correct options
    TRUE_FALSE       = "true_false"
    SHORT_TEXT       = "short_text"
    NUMERIC          = "numeric"
    ORDERING         = "ordering"           # put items in correct order
    MATCHING         = "matching"           # match pairs
    FILE_UPLOAD      = "file_upload"
    MANUAL_REVIEW    = "manual_review"      # graded by tutor


class TaskCompletionRule(str, enum.Enum):
    ALL_QUESTIONS     = "all_questions"      # must answer every question
    MANDATORY_ONLY    = "mandatory_only"     # only mandatory questions
    MIN_SCORE         = "min_score"          # reach a score threshold
    ANY_CORRECT       = "any_correct"        # at least one correct


class DifficultyLevel(str, enum.Enum):
    BEGINNER      = "beginner"
    EASY          = "easy"
    MEDIUM        = "medium"
    HARD          = "hard"
    EXPERT        = "expert"


class PublicationStatus(str, enum.Enum):
    DRAFT     = "draft"
    PUBLISHED = "published"
    ARCHIVED  = "archived"


# ═══════════════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    name            = Column(String(256), nullable=False)
    email           = Column(String(256), unique=True, nullable=False, index=True)
    institution     = Column(String(256), nullable=True)
    hashed_password = Column(String(256), nullable=False)
    role            = Column(Enum(Role), default=Role.LEARNER, nullable=False)
    points          = Column(Integer, default=0)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    environments      = relationship("Environment", back_populates="user")
    question_answers  = relationship("UserQuestionAnswer", back_populates="user", foreign_keys="[UserQuestionAnswer.user_id]")
    task_progress     = relationship("UserTaskProgress", back_populates="user")
    room_progress     = relationship("UserRoomProgress", back_populates="user")
    module_progress   = relationship("UserModuleProgress", back_populates="user")
    path_progress     = relationship("UserPathProgress", back_populates="user")
    hint_unlocks      = relationship("QuestionHintUnlock", back_populates="user")


# ═══════════════════════════════════════════════════════════════════════════
#  PLATFORM SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

class PlatformSettings(Base):
    __tablename__ = "platform_settings"

    id                         = Column(String(36), primary_key=True, default=lambda: "singleton")
    platform_name              = Column(String(256), default="AutoRange Cyber Range")
    default_task_points        = Column(Integer, default=100)
    default_time_limit_minutes = Column(Integer, default=120)
    hint_penalties_enabled     = Column(Boolean, default=True)
    provisioning_backend       = Column(String(64), default="simulate")


# ═══════════════════════════════════════════════════════════════════════════
#  LEARNING HIERARCHY  Path → Module → Room → Task → Question
# ═══════════════════════════════════════════════════════════════════════════

class Path(Base):
    """Top-level learning domain: Offensive | Defensive | Mitigation | Risk"""
    __tablename__ = "paths"

    id           = Column(String(36), primary_key=True, default=gen_uuid)
    slug         = Column(String(128), unique=True, nullable=False)
    title        = Column(String(256), nullable=False)
    description  = Column(Text, nullable=True)
    icon         = Column(String(128), nullable=True)   # emoji or icon name
    color        = Column(String(32),  default="#22D3EE")
    cover_image  = Column(String(512), nullable=True)
    sort_order   = Column(Integer, default=0)
    status       = Column(Enum(PublicationStatus), default=PublicationStatus.DRAFT)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modules      = relationship("Module", back_populates="path",
                                order_by="Module.sort_order", cascade="all, delete-orphan")
    user_progress = relationship("UserPathProgress", back_populates="path")


class Module(Base):
    """A thematic grouping of Rooms inside a Path."""
    __tablename__ = "modules"

    id           = Column(String(36), primary_key=True, default=gen_uuid)
    path_id      = Column(String(36), ForeignKey("paths.id"), nullable=False)
    slug         = Column(String(128), nullable=False)
    title        = Column(String(256), nullable=False)
    description  = Column(Text, nullable=True)
    sort_order   = Column(Integer, default=0)
    status       = Column(Enum(PublicationStatus), default=PublicationStatus.DRAFT)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    path         = relationship("Path", back_populates="modules")
    rooms        = relationship("Room", back_populates="module",
                                order_by="Room.sort_order", cascade="all, delete-orphan")
    user_progress = relationship("UserModuleProgress", back_populates="module")
    quiz_questions = relationship("ModuleQuizQuestion", back_populates="module",
                                  order_by="ModuleQuizQuestion.sort_order",
                                  cascade="all, delete-orphan")


class Room(Base):
    """A complete cyber scenario (formerly called a challenge room)."""
    __tablename__ = "rooms"

    id                  = Column(String(36), primary_key=True, default=gen_uuid)
    module_id           = Column(String(36), ForeignKey("modules.id"), nullable=False)
    slug                = Column(String(128), nullable=False)
    title               = Column(String(256), nullable=False)
    description         = Column(Text, nullable=True)
    story               = Column(Text, nullable=True)   # mission briefing narrative
    objectives          = Column(Text, nullable=True)   # semicolon-separated
    difficulty          = Column(Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    estimated_minutes   = Column(Integer, default=60)
    tags                = Column(String(512), nullable=True)
    mitre_attack        = Column(String(512), nullable=True)  # technique IDs, comma-separated
    prerequisites       = Column(Text, nullable=True)
    cover_image         = Column(String(512), nullable=True)
    xp_reward           = Column(Integer, default=0)   # auto-sum of task points if 0
    sort_order          = Column(Integer, default=0)
    status              = Column(Enum(PublicationStatus), default=PublicationStatus.DRAFT)
    created_by          = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    module           = relationship("Module", back_populates="rooms")
    tasks            = relationship("Task", back_populates="room",
                                    order_by="Task.sort_order", cascade="all, delete-orphan")
    vm_assignments   = relationship("RoomVMTemplate", back_populates="room",
                                    cascade="all, delete-orphan")
    environments     = relationship("Environment", back_populates="room")
    user_progress    = relationship("UserRoomProgress", back_populates="room")
    creator          = relationship("User", foreign_keys=[created_by])


class Task(Base):
    """One stage/phase inside a Room (e.g. Discover, Collect, Analyze)."""
    __tablename__ = "tasks"

    id               = Column(String(36), primary_key=True, default=gen_uuid)
    room_id          = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    title            = Column(String(256), nullable=False)
    description      = Column(Text, nullable=True)    # narrative / briefing
    objectives       = Column(Text, nullable=True)    # semicolon-separated
    sort_order       = Column(Integer, default=0)
    estimated_minutes = Column(Integer, default=20)
    points           = Column(Integer, default=0)     # auto-sum of question points if 0
    completion_rule  = Column(Enum(TaskCompletionRule),
                              default=TaskCompletionRule.ALL_QUESTIONS)
    min_score_pct    = Column(Integer, default=80)    # used with MIN_SCORE rule
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    room          = relationship("Room", back_populates="tasks")
    questions     = relationship("Question", back_populates="task",
                                 order_by="Question.sort_order", cascade="all, delete-orphan")
    user_progress = relationship("UserTaskProgress", back_populates="task")


class Question(Base):
    """An individual assessment unit inside a Task."""
    __tablename__ = "questions"

    id               = Column(String(36), primary_key=True, default=gen_uuid)
    task_id          = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    question_type    = Column(Enum(QuestionType), nullable=False, default=QuestionType.FLAG)
    text             = Column(Text, nullable=False)       # the question body
    explanation      = Column(Text, nullable=True)        # shown after correct answer
    points           = Column(Integer, default=10)
    is_mandatory     = Column(Boolean, default=True)
    sort_order       = Column(Integer, default=0)

    # Validation data stored as JSON — structure depends on question_type:
    # FLAG:          {"flag_hash": "...", "case_sensitive": false}
    # MCQ_SINGLE:    {"correct_option_id": "uuid"}
    # MCQ_MULTI:     {"correct_option_ids": ["uuid", ...]}
    # TRUE_FALSE:    {"correct": true}
    # SHORT_TEXT:    {"accepted": ["answer1", ...], "regex": null}
    # NUMERIC:       {"value": 42, "tolerance": 0}
    # ORDERING:      {"correct_order": ["id1","id2","id3"]}
    # MATCHING:      {"pairs": [{"left":"id","right":"id"}, ...]}
    # FILE_UPLOAD:   {"max_mb": 10, "allowed_types": ["pdf","png"]}
    # MANUAL_REVIEW: {"rubric": "..."}
    validation_data  = Column(JSON, nullable=True)

    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task     = relationship("Task", back_populates="questions")
    options  = relationship("QuestionOption", back_populates="question",
                            order_by="QuestionOption.sort_order", cascade="all, delete-orphan")
    hints    = relationship("QuestionHint", back_populates="question",
                            order_by="QuestionHint.order", cascade="all, delete-orphan")
    answers  = relationship("UserQuestionAnswer", back_populates="question",
                            cascade="all, delete-orphan")


class QuestionOption(Base):
    """An answer option for MCQ / Ordering / Matching questions."""
    __tablename__ = "question_options"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=False)
    text        = Column(Text, nullable=False)
    sort_order  = Column(Integer, default=0)

    # For MATCHING: store the matching key so pairs can be validated
    match_key   = Column(String(128), nullable=True)

    question    = relationship("Question", back_populates="options")


class QuestionHint(Base):
    """A hint that can be unlocked for a Question, optionally with a point cost."""
    __tablename__ = "question_hints"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=False)
    content     = Column(Text, nullable=False)
    cost        = Column(Integer, default=0)    # 0 = free
    order       = Column(Integer, default=0)

    question = relationship("Question", back_populates="hints")
    unlocks  = relationship("QuestionHintUnlock", back_populates="hint")


class QuestionHintUnlock(Base):
    """Records when a learner unlocks a hint."""
    __tablename__ = "question_hint_unlocks"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    hint_id     = Column(String(36), ForeignKey("question_hints.id"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="hint_unlocks")
    hint = relationship("QuestionHint", back_populates="unlocks")


# ═══════════════════════════════════════════════════════════════════════════
#  VM INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════

class VMTemplate(Base):
    __tablename__ = "vm_templates"

    id                  = Column(String(36), primary_key=True, default=gen_uuid)
    name                = Column(String(256), nullable=False)
    description         = Column(Text, nullable=True)
    zone                = Column(String(128), nullable=False)
    proxmox_template_id = Column(Integer, nullable=False)
    default_tools       = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    room_assignments = relationship("RoomVMTemplate", back_populates="vm_template")


class RoomVMTemplate(Base):
    """Many-to-many: a Room uses one or more VM Templates."""
    __tablename__ = "room_vm_templates"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    room_id        = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    vm_template_id = Column(String(36), ForeignKey("vm_templates.id"), nullable=False)
    sort_order     = Column(Integer, default=0)

    room        = relationship("Room", back_populates="vm_assignments")
    vm_template = relationship("VMTemplate", back_populates="room_assignments")


# ═══════════════════════════════════════════════════════════════════════════
#  CHALLENGES  (flat CTF-style challenge library, independent of the Path/Room hierarchy)
# ═══════════════════════════════════════════════════════════════════════════

class Category(Base):
    __tablename__ = "categories"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    slug        = Column(String(128), unique=True, nullable=False)
    name        = Column(String(256), nullable=False)
    color       = Column(String(32), default="coral")
    description = Column(Text, nullable=True)
    sort_order  = Column(Integer, default=0)

    challenges = relationship("Challenge", back_populates="category")


class Difficulty(Base):
    __tablename__ = "difficulties"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    slug       = Column(String(128), unique=True, nullable=False)
    name       = Column(String(256), nullable=False)
    sort_order = Column(Integer, default=0)

    challenges = relationship("Challenge", back_populates="difficulty")


class Challenge(Base):
    __tablename__ = "challenges"

    id                 = Column(String(36), primary_key=True, default=gen_uuid)
    title              = Column(String(256), nullable=False)
    description        = Column(Text, nullable=True)
    objectives         = Column(Text, nullable=True)
    category_id        = Column(String(36), ForeignKey("categories.id"), nullable=False)
    difficulty_id      = Column(String(36), ForeignKey("difficulties.id"), nullable=False)
    challenge_type     = Column(String(64), default="standard_flag")
    points             = Column(Integer, default=100)
    time_limit_minutes = Column(Integer, default=90)
    tags               = Column(String(512), nullable=True)
    flag_hash          = Column(String(128), nullable=False)
    is_published       = Column(Boolean, default=False)
    created_by         = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category   = relationship("Category", back_populates="challenges")
    difficulty = relationship("Difficulty", back_populates="challenges")
    creator    = relationship("User", foreign_keys=[created_by])
    vms        = relationship("ChallengeVM", back_populates="challenge", cascade="all, delete-orphan")
    hints      = relationship("Hint", back_populates="challenge",
                              order_by="Hint.order", cascade="all, delete-orphan")


class ChallengeVM(Base):
    """Many-to-many: a Challenge uses one or more VM Templates, positioned on a topology canvas."""
    __tablename__ = "challenge_vms"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    challenge_id   = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    vm_template_id = Column(String(36), ForeignKey("vm_templates.id"), nullable=False)
    canvas_x       = Column(Integer, default=100)
    canvas_y       = Column(Integer, default=150)

    challenge   = relationship("Challenge", back_populates="vms")
    vm_template = relationship("VMTemplate")


class Hint(Base):
    """A hint that can be unlocked for a Challenge, optionally with a point cost."""
    __tablename__ = "hints"

    id           = Column(String(36), primary_key=True, default=gen_uuid)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    content      = Column(Text, nullable=False)
    cost         = Column(Integer, default=10)
    order        = Column(Integer, default=0)

    challenge = relationship("Challenge", back_populates="hints")
    unlocks   = relationship("HintUnlock", back_populates="hint")


class HintUnlock(Base):
    """Records when a learner unlocks a hint for a Challenge."""
    __tablename__ = "hint_unlocks"

    id           = Column(String(36), primary_key=True, default=gen_uuid)
    user_id      = Column(String(36), ForeignKey("users.id"), nullable=False)
    challenge_id = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    hint_id      = Column(String(36), ForeignKey("hints.id"), nullable=False)
    unlocked_at  = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    hint = relationship("Hint", back_populates="unlocks")


class FlagSubmission(Base):
    """Every flag submission attempt by a learner for a Challenge."""
    __tablename__ = "flag_submissions"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    user_id         = Column(String(36), ForeignKey("users.id"), nullable=False)
    challenge_id    = Column(String(36), ForeignKey("challenges.id"), nullable=False)
    submitted_value = Column(Text, nullable=True)
    is_correct      = Column(Boolean, default=False)
    points_awarded  = Column(Integer, default=0)
    submitted_at    = Column(DateTime, default=datetime.utcnow)

    user      = relationship("User")
    challenge = relationship("Challenge")


# ═══════════════════════════════════════════════════════════════════════════
#  ENVIRONMENTS  (VM sessions — linked to Room, not individual Task)
# ═══════════════════════════════════════════════════════════════════════════

class Environment(Base):
    __tablename__ = "environments"

    id            = Column(String(36), primary_key=True, default=gen_uuid)
    user_id       = Column(String(36), ForeignKey("users.id"), nullable=False)
    room_id       = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    status        = Column(Enum(EnvironmentStatus), default=EnvironmentStatus.PENDING)
    topology_json         = Column(Text, nullable=True)
    started_at            = Column(DateTime, nullable=True)
    expires_at            = Column(DateTime, nullable=True)
    destroyed_at          = Column(DateTime, nullable=True)
    paused_at             = Column(DateTime, nullable=True)
    time_remaining_seconds = Column(Integer, nullable=True)  # saved when paused
    last_heartbeat        = Column(DateTime, nullable=True)  # updated by the lab page while open

    user = relationship("User", back_populates="environments")
    room = relationship("Room", back_populates="environments")
    vms  = relationship("EnvironmentVM", back_populates="environment",
                        cascade="all, delete-orphan")


class EnvironmentVM(Base):
    __tablename__ = "environment_vms"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    environment_id = Column(String(36), ForeignKey("environments.id"), nullable=False)
    vm_template_id = Column(String(36), ForeignKey("vm_templates.id"), nullable=False)
    proxmox_vmid   = Column(Integer, nullable=True)
    proxmox_node   = Column(String(128), nullable=True)
    ip_address     = Column(String(64), nullable=True)
    status         = Column(String(32), default="pending")

    environment = relationship("Environment", back_populates="vms")
    vm_template = relationship("VMTemplate")


# ═══════════════════════════════════════════════════════════════════════════
#  PROGRESS TRACKING
# ═══════════════════════════════════════════════════════════════════════════

class UserQuestionAnswer(Base):
    """Every submission by a learner for a Question."""
    __tablename__ = "user_question_answers"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    user_id         = Column(String(36), ForeignKey("users.id"), nullable=False)
    question_id     = Column(String(36), ForeignKey("questions.id"), nullable=False)
    submitted_value = Column(Text, nullable=True)
    submitted_data  = Column(JSON, nullable=True)
    is_correct      = Column(Boolean, default=False)
    points_awarded  = Column(Integer, default=0)
    attempt_number  = Column(Integer, default=1)
    submitted_at    = Column(DateTime, default=datetime.utcnow)
    reviewed_by     = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_notes    = Column(Text, nullable=True)

    user     = relationship("User", back_populates="question_answers", foreign_keys="[UserQuestionAnswer.user_id]")
    question = relationship("Question", back_populates="answers")
    reviewer = relationship("User", foreign_keys="[UserQuestionAnswer.reviewed_by]")


class UserTaskProgress(Base):
    """Aggregated progress for a learner on a Task."""
    __tablename__ = "user_task_progress"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    user_id        = Column(String(36), ForeignKey("users.id"), nullable=False)
    task_id        = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    is_completed   = Column(Boolean, default=False)
    score          = Column(Integer, default=0)
    max_score      = Column(Integer, default=0)
    started_at     = Column(DateTime, nullable=True)
    completed_at   = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="task_progress")
    task = relationship("Task", back_populates="user_progress")


class UserRoomProgress(Base):
    """Aggregated progress for a learner in a Room."""
    __tablename__ = "user_room_progress"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    user_id        = Column(String(36), ForeignKey("users.id"), nullable=False)
    room_id        = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    is_completed   = Column(Boolean, default=False)
    score          = Column(Integer, default=0)
    max_score      = Column(Integer, default=0)
    tasks_done     = Column(Integer, default=0)
    tasks_total    = Column(Integer, default=0)
    started_at     = Column(DateTime, nullable=True)
    completed_at   = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="room_progress")
    room = relationship("Room", back_populates="user_progress")


class UserModuleProgress(Base):
    """Aggregated progress for a learner through a Module."""
    __tablename__ = "user_module_progress"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    user_id        = Column(String(36), ForeignKey("users.id"), nullable=False)
    module_id      = Column(String(36), ForeignKey("modules.id"), nullable=False)
    is_completed   = Column(Boolean, default=False)
    rooms_done     = Column(Integer, default=0)
    rooms_total    = Column(Integer, default=0)
    score          = Column(Integer, default=0)
    started_at     = Column(DateTime, nullable=True)
    completed_at   = Column(DateTime, nullable=True)

    user   = relationship("User", back_populates="module_progress")
    module = relationship("Module", back_populates="user_progress")


class UserPathProgress(Base):
    """Top-level progress for a learner through a Path."""
    __tablename__ = "user_path_progress"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    user_id         = Column(String(36), ForeignKey("users.id"), nullable=False)
    path_id         = Column(String(36), ForeignKey("paths.id"), nullable=False)
    is_completed    = Column(Boolean, default=False)
    modules_done    = Column(Integer, default=0)
    modules_total   = Column(Integer, default=0)
    score           = Column(Integer, default=0)
    started_at      = Column(DateTime, nullable=True)
    completed_at    = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="path_progress")
    path = relationship("Path", back_populates="user_progress")

# ═══════════════════════════════════════════════════════════════════════════
#  MODULE QUIZ
# ═══════════════════════════════════════════════════════════════════════════

class ModuleQuizQuestion(Base):
    """An MCQ question attached to a Module for the end-of-module quiz."""
    __tablename__ = "module_quiz_questions"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    module_id       = Column(String(36), ForeignKey("modules.id"), nullable=False)
    text            = Column(Text, nullable=False)
    explanation     = Column(Text, nullable=True)    # shown after grading
    points          = Column(Integer, default=10)
    sort_order      = Column(Integer, default=0)
    # validation_data: {"correct_option_id": "uuid", "correct_option_index": N}
    validation_data = Column(JSON, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    module  = relationship("Module", back_populates="quiz_questions")
    options = relationship("ModuleQuizOption", back_populates="question",
                           order_by="ModuleQuizOption.sort_order",
                           cascade="all, delete-orphan")


class ModuleQuizOption(Base):
    """An answer option for a ModuleQuizQuestion."""
    __tablename__ = "module_quiz_options"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("module_quiz_questions.id"), nullable=False)
    text        = Column(Text, nullable=False)
    sort_order  = Column(Integer, default=0)

    question = relationship("ModuleQuizQuestion", back_populates="options")


class UserModuleQuizAttempt(Base):
    """Records a learner's quiz attempt for a Module."""
    __tablename__ = "user_module_quiz_attempts"

    id          = Column(String(36), primary_key=True, default=gen_uuid)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    module_id   = Column(String(36), ForeignKey("modules.id"), nullable=False)
    score       = Column(Integer, default=0)
    max_score   = Column(Integer, default=0)
    passed      = Column(Boolean, default=False)
    pass_pct    = Column(Integer, default=70)   # threshold used at time of attempt
    attempted_at = Column(DateTime, default=datetime.utcnow)
    # JSON list of {question_id, selected_option_id, is_correct}
    answers_json = Column(JSON, nullable=True)

    user   = relationship("User")
    module = relationship("Module")
