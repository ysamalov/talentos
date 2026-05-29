#!/usr/bin/env python3
"""
Seed script — creates rich demo data: company, users, vacancies, candidates with full AI score breakdowns.
Run: python scripts/seed.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.db.session import AsyncSessionLocal, init_db
from backend.app.models.models import (
    Company, User, Vacancy, Candidate, CandidateVacancy,
    Resume, InterviewSession, InterviewType
)
from backend.app.core.security import get_password_hash
from datetime import datetime, timezone, timedelta


DEMO_VACANCIES = [
    dict(title="Senior Software Engineer", department="Engineering", location="Remote / Алматы",
         remote_policy="hybrid", employment_type="full-time", seniority_level="senior",
         salary_min=1400000, salary_max=1800000, salary_currency="KZT",
         description="Ищем опытного fullstack-разработчика для высоконагруженной fintech-платформы.",
         required_skills=["React","Node.js","PostgreSQL","TypeScript","AWS"],
         nice_to_have_skills=["Kubernetes","GraphQL","Terraform"], status="open"),
    dict(title="Product Manager", department="Product", location="Астана",
         remote_policy="onsite", employment_type="full-time", seniority_level="mid",
         salary_min=1200000, salary_max=1500000, salary_currency="KZT",
         description="PM для B2B SaaS-продукта. Нужен человек с аналитическим мышлением и опытом в growth.",
         required_skills=["Product Strategy","Analytics","Agile","SQL"],
         nice_to_have_skills=["Figma","A/B Testing","Mixpanel"], status="open"),
    dict(title="Data Scientist", department="Analytics", location="Алматы",
         remote_policy="hybrid", employment_type="full-time", seniority_level="senior",
         salary_min=1300000, salary_max=1600000, salary_currency="KZT",
         description="Data Scientist для рекомендательных систем и ML-пайплайнов.",
         required_skills=["Python","Machine Learning","SQL","Statistics","MLflow"],
         nice_to_have_skills=["Spark","Feast","Airflow"], status="open"),
    dict(title="UX Designer", department="Design", location="Алматы",
         remote_policy="hybrid", employment_type="full-time", seniority_level="senior",
         salary_min=1100000, salary_max=1400000, salary_currency="KZT",
         description="Senior UX Designer для создания дизайн-системы.",
         required_skills=["Figma","User Research","Design Systems","Prototyping"],
         nice_to_have_skills=["Motion Design","Framer"], status="open"),
    dict(title="DevOps Engineer", department="Infrastructure", location="Remote",
         remote_policy="remote", employment_type="full-time", seniority_level="mid",
         salary_min=1200000, salary_max=1500000, salary_currency="KZT",
         description="DevOps для поддержки и масштабирования облачной инфраструктуры.",
         required_skills=["Kubernetes","Docker","AWS","Terraform","CI/CD"],
         nice_to_have_skills=["Helm","Prometheus","ArgoCD"], status="open"),
]

DEMO_CANDIDATES = [
    dict(full_name="Алибек Жақсыбеков", email="alibek.zhaksybekov@example.com", phone="+7-777-555-0101",
         linkedin_url="https://linkedin.com/in/alibek-zhaksybekov", location="Алматы", source="linkedin",
         tags=["fullstack","fintech","senior"], vacancy_idx=0, stage="interview", ai_score=91,
         breakdown={"skills":94,"experience":90,"seniority":92,"culture":85,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["7 лет fullstack опыта","Опыт с высоконагруженными системами","Fintech бэкграунд совпадает"],
           "risks":["Ожидания (₸1.6M) на 8% выше бюджета"],"missing_skills":["Kubernetes","Terraform"],
           "matching_skills":["React","Node.js","PostgreSQL","TypeScript","AWS"],
           "recommendation":"Настоятельно рекомендуем",
           "summary":"Сильный fullstack с релевантным fintech опытом. Высокое совпадение по навыкам (94%). Рекомендуем к тех. интервью."},
         skills=["React","Node.js","PostgreSQL","TypeScript","AWS","Redis","Docker"], yoe=7, sen="senior", smin=1500000, smax=1700000),
    dict(full_name="Айгерим Сейткали", email="aigerim.seitkali@example.com", phone="+7-701-555-0102",
         linkedin_url="https://linkedin.com/in/aigerim-seitkali", location="Астана", source="hh",
         tags=["product","b2b","saas"], vacancy_idx=1, stage="ai_screening", ai_score=88,
         breakdown={"skills":89,"experience":85,"seniority":88,"culture":90,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Опыт в B2B SaaS","Высокий культурный фит 90%","Аналитический подход"],
           "risks":["Нет опыта в международных командах"],"missing_skills":["Mixpanel"],
           "matching_skills":["Product Strategy","SQL","Agile","A/B Testing"],
           "recommendation":"Рекомендуем",
           "summary":"Опытный PM с фокусом на данных. Культурный фит 90%. Рекомендуем к HR-интервью."},
         skills=["Product Strategy","SQL","Figma","Agile","A/B тесты","Analytics"], yoe=5, sen="mid", smin=1300000, smax=1500000),
    dict(full_name="Нурсултан Бекенов", email="nursultan.bekenov@example.com", phone="+7-705-555-0103",
         location="Алматы", source="referral", tags=["data science","ml","python"],
         vacancy_idx=2, stage="hr_review", ai_score=79,
         breakdown={"skills":82,"experience":74,"seniority":78,"culture":82,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["ML-публикации в arxiv","Опыт деплоя моделей в prod"],
           "risks":["Опыт (4г) ниже Senior уровня","Нет MLflow"],"missing_skills":["MLflow","Feast","Spark"],
           "matching_skills":["Python","Machine Learning","SQL","Statistics"],
           "recommendation":"Возможно",
           "summary":"Технически сильный, но недостаточно опыта для Senior. Можно рассмотреть на Middle."},
         skills=["Python","Machine Learning","SQL","PyTorch","Statistics","NLP"], yoe=4, sen="mid", smin=1200000, smax=1400000),
    dict(full_name="Дильназ Омарова", email="dilnaz.omarova@example.com", phone="+7-707-555-0104",
         linkedin_url="https://linkedin.com/in/dilnaz-omarova", portfolio_url="https://dilnaz.design",
         location="Алматы", source="linkedin", tags=["ux","design systems","figma"],
         vacancy_idx=3, stage="offer", ai_score=93,
         breakdown={"skills":96,"experience":91,"seniority":93,"culture":88,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Портфолио мирового уровня","Design system с нуля","Топовые европейские стартапы"],
           "risks":["Требует частичную релокацию"],"missing_skills":[],
           "matching_skills":["Figma","User Research","Design Systems","Motion Design"],
           "recommendation":"Настоятельно рекомендуем",
           "summary":"Исключительный кандидат. 96% совпадение. Готова к релокации."},
         skills=["Figma","User Research","Design Systems","Motion Design","Framer","Principle"], yoe=6, sen="senior", smin=1100000, smax=1300000),
    dict(full_name="Тимур Абдрахманов", email="timur.abdrakhmanov@example.com", phone="+7-712-555-0105",
         location="Шымкент", source="hh", tags=["devops","docker","ci-cd"],
         vacancy_idx=4, stage="applied", ai_score=71,
         breakdown={"skills":74,"experience":65,"seniority":70,"culture":75,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Базовые DevOps навыки","Open source активность на GitHub"],
           "risks":["Нет Kubernetes и Terraform","Опыт ниже необходимого"],"missing_skills":["Kubernetes","Terraform","AWS"],
           "matching_skills":["Docker","CI/CD","Linux"],
           "recommendation":"Возможно",
           "summary":"Хороший потенциал, но не дотягивает по ключевым требованиям. Рассмотреть через 1–2 года."},
         skills=["Docker","CI/CD","Linux","Nginx","Git","Ansible"], yoe=3, sen="mid", smin=900000, smax=1100000),
    dict(full_name="Сабина Касымова", email="sabina.kassymova@example.com", phone="+7-727-555-0106",
         linkedin_url="https://linkedin.com/in/sabina-kassymova", location="Алматы", source="linkedin",
         tags=["fullstack","react","typescript"], vacancy_idx=0, stage="technical_interview", ai_score=84,
         breakdown={"skills":87,"experience":82,"seniority":83,"culture":85,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Сильный frontend + бэкенд","Опыт в продуктовых компаниях"],
           "risks":["Нет опыта с высокой нагрузкой >10M DAU"],"missing_skills":["Node.js","Redis"],
           "matching_skills":["React","TypeScript","PostgreSQL","AWS"],
           "recommendation":"Рекомендуем",
           "summary":"Хороший fullstack с фокусом на frontend. 87% совпадение. Рекомендуем к тех. интервью."},
         skills=["React","TypeScript","GraphQL","PostgreSQL","AWS","Jest"], yoe=5, sen="senior", smin=1400000, smax=1600000),
    dict(full_name="Максат Жунусов", email="maksat.zhunusov@example.com", phone="+7-776-555-0107",
         location="Алматы", source="hh", tags=["marketing"],
         vacancy_idx=1, stage="rejected", ai_score=62,
         breakdown={"skills":65,"experience":52,"seniority":58,"culture":70,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Коммуникативные навыки"],
           "risks":["Критически мало опыта (2г из 4+)","Нет performance маркетинга","Нет B2B опыта"],
           "missing_skills":["Google Ads","Meta Ads","SEO","CRM"],"matching_skills":[],
           "recommendation":"Отказ",
           "summary":"Не соответствует требованиям. Недостаточно опыта, отсутствуют ключевые навыки."},
         skills=["SMM","Canva","Email маркетинг","Copywriting"], yoe=2, sen="junior", smin=800000, smax=950000),
    dict(full_name="Жансая Тулеубаева", email="zhansaya.tuleyubayeva@example.com", phone="+7-778-555-0108",
         linkedin_url="https://linkedin.com/in/zhansaya-t", location="Астана", source="referral",
         tags=["data science","nlp","mlflow"], vacancy_idx=2, stage="hr_review", ai_score=86,
         breakdown={"skills":91,"experience":84,"seniority":85,"culture":80,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["NLP специализация — редкий навык","MLflow — точное совпадение","Реферал от сотрудника"],
           "risks":["Нет опыта в системах >1M пользователей"],"missing_skills":["Feast","Airflow"],
           "matching_skills":["Python","Machine Learning","SQL","MLflow","Statistics"],
           "recommendation":"Рекомендуем",
           "summary":"Сильный кандидат с нужной специализацией. NLP+MLflow — редкое совпадение. Реферальный найм снижает риски."},
         skills=["Python","PyTorch","SQL","MLflow","NLP","Spark","Statistics"], yoe=5, sen="senior", smin=1250000, smax=1450000),
    dict(full_name="Берик Сейітқали", email="berik.seitkali2@example.com", phone="+7-701-555-0109",
         location="Алматы", source="direct", tags=["devops","kubernetes","aws"],
         vacancy_idx=4, stage="interview", ai_score=89,
         breakdown={"skills":92,"experience":88,"seniority":87,"culture":84,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Certified Kubernetes Administrator","AWS Solutions Architect","6 лет в DevOps"],
           "risks":["Ожидания на верхней границе бюджета"],"missing_skills":["ArgoCD"],
           "matching_skills":["Kubernetes","Docker","AWS","Terraform","CI/CD"],
           "recommendation":"Рекомендуем",
           "summary":"Отличный DevOps с нужными сертификатами. 92% совпадение. Рекомендуем к финальному интервью."},
         skills=["Kubernetes","Docker","AWS","Terraform","CI/CD","Helm","Prometheus"], yoe=6, sen="senior", smin=1400000, smax=1550000),
    dict(full_name="Ақерке Мұхамедқызы", email="akerke.mukhamedkyzy@example.com", phone="+7-707-555-0110",
         linkedin_url="https://linkedin.com/in/akerke-m", location="Алматы", source="linkedin",
         tags=["ux","research","figma"], vacancy_idx=3, stage="ai_screening", ai_score=77,
         breakdown={"skills":80,"experience":73,"seniority":75,"culture":82,
           "weights":{"skills":35,"experience":30,"seniority":20,"culture":15},
           "strengths":["Сильный UX research","Опыт проведения usability tests"],
           "risks":["Нет опыта с Design Systems","3.5г опыта — немного для Senior"],
           "missing_skills":["Design Systems","Motion Design"],"matching_skills":["Figma","User Research","Prototyping"],
           "recommendation":"Возможно",
           "summary":"Способный UX Designer, но не хватает опыта с Design Systems. Рассмотреть на Middle/Senior позицию."},
         skills=["Figma","User Research","Prototyping","Usability Testing","Sketch"], yoe=4, sen="mid", smin=950000, smax=1150000),
]


async def seed():
    print("Initializing database...")
    await init_db()
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        company = Company(name="TalentOS Demo Corp", domain="talentos-demo.kz",
                          industry="Technology", size="100-200",
                          settings={"theme":"light","language":"ru"})
        db.add(company)
        await db.flush()

        admin = User(company_id=company.id, email="demo@talentos.ai",
                     hashed_password=get_password_hash("demo1234"), full_name="Сара Митчелл",
                     role="admin", is_verified=True)
        recruiter = User(company_id=company.id, email="recruiter@talentos.ai",
                         hashed_password=get_password_hash("demo1234"), full_name="Том Брэдли",
                         role="recruiter", is_verified=True)
        manager = User(company_id=company.id, email="manager@talentos.ai",
                       hashed_password=get_password_hash("demo1234"), full_name="Ержан Ахметов",
                       role="hiring_manager", is_verified=True)
        db.add_all([admin, recruiter, manager])
        await db.flush()

        vacancy_objs = []
        for v_data in DEMO_VACANCIES:
            v = Vacancy(company_id=company.id, created_by_id=admin.id, **v_data)
            db.add(v)
            await db.flush()
            vacancy_objs.append(v)

        for i, c_data in enumerate(DEMO_CANDIDATES):
            vacancy = vacancy_objs[c_data.pop("vacancy_idx")]
            stage = c_data.pop("stage")
            ai_score = c_data.pop("ai_score")
            breakdown = c_data.pop("breakdown")
            skills = c_data.pop("skills")
            yoe = c_data.pop("yoe")
            sen = c_data.pop("sen")
            smin = c_data.pop("smin")
            smax = c_data.pop("smax")

            c = Candidate(company_id=company.id, **c_data)
            db.add(c)
            await db.flush()

            resume = Resume(
                candidate_id=c.id,
                file_path=f"/uploads/resumes/{c.id}_resume.pdf",
                file_name=f"resume_{i+1}.pdf",
                file_type="pdf", file_size=128000 + i * 10000,
                skills=skills, years_experience=yoe, seniority=sen,
                salary_expectation_min=smin, salary_expectation_max=smax,
                is_parsed=True, parsed_at=now - timedelta(days=i+1), is_primary=True,
                parsed_data={"full_name": c_data["full_name"], "email": c_data["email"],
                             "skills": skills, "years_of_experience": yoe, "seniority": sen},
            )
            db.add(resume)

            cv = CandidateVacancy(
                candidate_id=c.id, vacancy_id=vacancy.id,
                stage=stage, ai_score=ai_score, score_breakdown=breakdown,
                applied_at=now - timedelta(days=14-i),
                stage_updated_at=now - timedelta(days=7-i),
            )
            db.add(cv)
            await db.flush()

            if stage in ("interview","technical_interview","offer","hired"):
                session = InterviewSession(
                    candidate_id=c.id, vacancy_id=vacancy.id,
                    interview_type=InterviewType.HR, is_ai_session=True,
                    status="completed",
                    started_at=now - timedelta(days=5-(i%3)),
                    ended_at=now - timedelta(days=5-(i%3), hours=-1),
                    ai_score=ai_score-2, ai_summary=breakdown["summary"],
                    messages=[
                        {"role":"assistant","content":"Здравствуйте! Расскажите о себе.","timestamp":(now-timedelta(days=5)).isoformat()},
                        {"role":"user","content":f"Привет! Меня зовут {c_data['full_name']}...","timestamp":(now-timedelta(days=5,minutes=-2)).isoformat()},
                    ],
                )
                db.add(session)

        await db.commit()
        print(f"✓ Company: {company.name}")
        print(f"✓ Users: demo@talentos.ai / recruiter@talentos.ai / manager@talentos.ai (pass: demo1234)")
        print(f"✓ Vacancies: {len(DEMO_VACANCIES)}")
        print(f"✓ Candidates: {len(DEMO_CANDIDATES)} with full score breakdowns + resumes")
        print("\nDone! 🚀")


if __name__ == "__main__":
    asyncio.run(seed())
