from pydantic import BaseModel


class EmployerAnswerItem(BaseModel):
    question_label: str
    answer: str


class EmployerAnswerGroup(BaseModel):
    employer_slug: str
    answers: list[EmployerAnswerItem]


class EmployerSlugSummary(BaseModel):
    employer_slug: str
    answer_count: int
