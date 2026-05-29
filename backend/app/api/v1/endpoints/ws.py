"""
WebSocket endpoint for real-time AI screening chat.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
import json
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.websocket("/ws/screening/{session_id}")
async def screening_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    from app.core.security import verify_token
    from app.db.session import AsyncSessionLocal
    from app.models.models import InterviewSession, Candidate, Vacancy
    from app.services.ai.screening import screening_service

    user_id = verify_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(InterviewSession).where(InterviewSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                await websocket.send_json({"error": "Session not found"})
                await websocket.close()
                return

            cand_result = await db.execute(select(Candidate).where(Candidate.id == session.candidate_id))
            candidate = cand_result.scalar_one_or_none()

            vac_result = await db.execute(select(Vacancy).where(Vacancy.id == session.vacancy_id))
            vacancy = vac_result.scalar_one_or_none()

            candidate_data = {
                "full_name": candidate.full_name,
                "skills": [],
                "years_experience": 0,
                "seniority": "mid",
            }
            vacancy_data = {
                "title": vacancy.title,
                "required_skills": vacancy.required_skills,
                "seniority_level": vacancy.seniority_level,
                "salary_min": vacancy.salary_min,
                "salary_max": vacancy.salary_max,
            }

            # Send opening if session is fresh
            if not session.messages:
                opening = await screening_service.get_opening_message(vacancy_data, candidate_data)
                session.messages = [{"role": "assistant", "content": opening, "timestamp": datetime.now(timezone.utc).isoformat()}]
                session.started_at = datetime.now(timezone.utc)
                await db.commit()
                await websocket.send_json({
                    "type": "message",
                    "role": "assistant",
                    "content": opening,
                    "timestamp": session.messages[-1]["timestamp"],
                })

            # Main loop
            while True:
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("type") == "message":
                    user_content = msg["content"]
                    session.messages.append({
                        "role": "user",
                        "content": user_content,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

                    # Stream thinking indicator
                    await websocket.send_json({"type": "typing"})

                    # Get AI response
                    ai_history = [{"role": m["role"], "content": m["content"]} for m in session.messages[:-1]]
                    response = await screening_service.respond(
                        vacancy=vacancy_data,
                        candidate=candidate_data,
                        conversation_history=ai_history,
                        user_message=user_content,
                    )

                    session.messages.append({
                        "role": "assistant",
                        "content": response,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                    await db.commit()

                    await websocket.send_json({
                        "type": "message",
                        "role": "assistant",
                        "content": response,
                        "timestamp": session.messages[-1]["timestamp"],
                    })

                elif msg.get("type") == "end":
                    # Generate final summary
                    await websocket.send_json({"type": "summarizing"})
                    history = [{"role": m["role"], "content": m["content"]} for m in session.messages]
                    summary = await screening_service.generate_summary(vacancy_data, candidate_data, history)
                    session.ai_summary = summary.summary_text
                    session.ai_score = summary.updated_score
                    session.score_breakdown = summary.model_dump()
                    session.ended_at = datetime.now(timezone.utc)
                    session.status = "completed"
                    await db.commit()
                    await websocket.send_json({"type": "summary", "data": summary.model_dump()})
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
