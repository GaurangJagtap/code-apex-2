import os
import uuid
import datetime
from typing import Optional, Dict, List, Any
from fastapi import FastAPI, Request, Form, Response, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="DevStore Controlled Sample E-Commerce App", version="1.0.0")

# Mount static and templates
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

def render_template(request: Request, name: str, context: Optional[Dict[str, Any]] = None) -> HTMLResponse:
    ctx = context or {}
    ctx["request"] = request
    return templates.TemplateResponse(request, name, ctx)

# Initial Synthetic Data
INITIAL_PRODUCTS = [
    {
        "id": "PRD-01",
        "name": "DevPulse Mechanical Keyboard",
        "category": "Hardware",
        "price": 129.99,
        "description": "Custom hot-swappable tactile switches, RGB underglow, aircraft-grade aluminum casing.",
    },
    {
        "id": "PRD-02",
        "name": "UltraWide 4K Coding Monitor",
        "category": "Hardware",
        "price": 449.00,
        "description": "34-inch curved IPS panel, USB-C 90W power delivery, 99% sRGB color accuracy.",
    },
    {
        "id": "PRD-03",
        "name": "Ergonomic Mesh Task Chair",
        "category": "Furniture",
        "price": 289.50,
        "description": "Breathable mesh backing, dynamic lumbar support, 4D adjustable armrests.",
    },
    {
        "id": "PRD-04",
        "name": "Studio ANC Headphones",
        "category": "Audio",
        "price": 199.00,
        "description": "Active noise cancellation tuned for engineering focus, 40-hour battery life.",
    },
    {
        "id": "PRD-05",
        "name": "Thunderbolt 4 Pro Dock",
        "category": "Accessories",
        "price": 149.00,
        "description": "12-in-1 connectivity hub supporting dual 4K 60Hz displays and 10Gbps transfers.",
    },
]

INITIAL_USERS = {
    "tester@apexqa.io": {
        "name": "Alex QA Lead",
        "email": "tester@apexqa.io",
        "password": "Password123!",
        "created_at": "2026-01-15T10:00:00Z"
    }
}

# Runtime In-Memory State
db_products: List[Dict[str, Any]] = [dict(p) for p in INITIAL_PRODUCTS]
db_users: Dict[str, Dict[str, Any]] = {k: dict(v) for k, v in INITIAL_USERS.items()}
db_carts: Dict[str, List[Dict[str, Any]]] = {}
db_orders: List[Dict[str, Any]] = []

INITIAL_ASSESSMENT_SUBMISSIONS = [
    {
        "submission_id": "SUB-INIT-01",
        "candidate_name": "Taylor Dev",
        "candidate_email": "taylor.dev@example.com",
        "score_percent": "100%",
        "submitted_at": "2026-03-01 14:30"
    }
]
db_assessment_submissions: List[Dict[str, Any]] = list(INITIAL_ASSESSMENT_SUBMISSIONS)
db_candidate_sessions: Dict[str, Dict[str, Any]] = {}

# Controlled Seeded Defects Mode (True = Planted Defect Active; False = Clean/Fixed Build)
SEEDED_DEFECTS_STATE: Dict[str, bool] = {
    # DevStore E-Commerce Seeded Defects
    "BUG-01": True,  # Faulty Email Format Validation (/register)
    "BUG-02": True,  # Cart Subtotal Calculation Failure on Quantity Update (/cart)
    "BUG-03": True,  # Missing Validation on Required Postal/ZIP Code (/checkout)
    "BUG-04": True,  # Non-Idempotent Duplicate Order Submission (/checkout)
    "BUG-05": True,  # Broken Access Control on Protected Account Route (/account)

    # iMocha-Style Hiring & Assessment Benchmark Seeded Defects
    "ASSESS-01": True,  # State Recovery Failure: Answer State Lost on Page Refresh (/assessment/test)
    "ASSESS-02": True,  # Non-Idempotent Duplicate Assessment Submission on Rapid Click (/assessment/submit)
    "ASSESS-03": True,  # Score Calculation Arithmetic Bug: Reports 33% instead of 100% (/assessment/submit)
    "ASSESS-04": True,  # Broken Access Control on Recruiter Results Dashboard (/assessment/recruiter/results)
    "ASSESS-05": True,  # Missing Format Validation on Candidate Access Code (/assessment/start)
}

def get_session_id(request: Request) -> str:
    session_id = request.cookies.get("devstore_session")
    if not session_id:
        session_id = str(uuid.uuid4())
    return session_id

def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    user_email = request.cookies.get("devstore_user")
    if user_email and user_email in db_users:
        return db_users[user_email]
    return None

def get_cart_for_session(session_id: str) -> List[Dict[str, Any]]:
    if session_id not in db_carts:
        db_carts[session_id] = []
    return db_carts[session_id]

def get_cart_count(session_id: str) -> int:
    cart = get_cart_for_session(session_id)
    return sum(item["quantity"] for item in cart)

# ----------------- Seeded Defect Endpoints & Pages -----------------

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    response = render_template(request, "index.html", {
        "products": db_products,
        "cart_count": get_cart_count(session_id),
        "user": user
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/products", response_class=HTMLResponse)
async def products(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    response = render_template(request, "products.html", {
        "products": db_products,
        "cart_count": get_cart_count(session_id),
        "user": user
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/products/{product_id}", response_class=HTMLResponse)
async def product_detail(product_id: str, request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    product = next((p for p in db_products if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    response = render_template(request, "product_detail.html", {
        "product": product,
        "cart_count": get_cart_count(session_id),
        "user": user
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/cart", response_class=HTMLResponse)
async def view_cart(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    cart = get_cart_for_session(session_id)
    
    # Calculate cart totals
    cart_items = []
    raw_subtotal = 0.0
    for item in cart:
        prod = next((p for p in db_products if p["id"] == item["product_id"]), None)
        if prod:
            line_total = prod["price"] * item["quantity"]
            raw_subtotal += line_total
            cart_items.append({
                "product": prod,
                "quantity": item["quantity"],
                "line_total": line_total
            })

    shipping = 15.00 if cart_items else 0.0
    tax = round(raw_subtotal * 0.08, 2)
    total = raw_subtotal + shipping + tax

    response = render_template(request, "cart.html", {
        "items": cart_items,
        "subtotal": raw_subtotal,
        "shipping": shipping,
        "tax": tax,
        "total": total,
        "cart_count": sum(i["quantity"] for i in cart_items),
        "user": user,
        "defects_enabled": SEEDED_DEFECTS_STATE.get("BUG-02", True)
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/cart/add")
async def add_to_cart(
    request: Request,
    product_id: str = Form(...),
    quantity: int = Form(1)
):
    session_id = get_session_id(request)
    cart = get_cart_for_session(session_id)
    
    existing = next((item for item in cart if item["product_id"] == product_id), None)
    if existing:
        existing["quantity"] += quantity
    else:
        cart.append({"product_id": product_id, "quantity": quantity})
        
    response = RedirectResponse(url="/cart", status_code=303)
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/cart/update")
async def update_cart_item(
    request: Request,
    product_id: str = Form(...),
    quantity: int = Form(...)
):
    session_id = get_session_id(request)
    cart = get_cart_for_session(session_id)
    for item in cart:
        if item["product_id"] == product_id:
            item["quantity"] = max(1, quantity)
            break
    return JSONResponse({"status": "ok", "product_id": product_id, "quantity": quantity})

@app.post("/cart/remove")
async def remove_cart_item(
    request: Request,
    product_id: str = Form(...)
):
    session_id = get_session_id(request)
    cart = get_cart_for_session(session_id)
    db_carts[session_id] = [item for item in cart if item["product_id"] != product_id]
    response = RedirectResponse(url="/cart", status_code=303)
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/checkout", response_class=HTMLResponse)
async def checkout_page(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    cart = get_cart_for_session(session_id)
    
    if not cart:
        return RedirectResponse(url="/cart", status_code=303)

    response = render_template(request, "checkout.html", {
        "default_name": user["name"] if user else "",
        "default_email": user["email"] if user else "",
        "cart_count": get_cart_count(session_id),
        "user": user,
        "error": None,
        "bug04_active": SEEDED_DEFECTS_STATE.get("BUG-04", True)
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/checkout")
async def process_checkout(
    request: Request,
    fullname: str = Form(...),
    email: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    postal_code: Optional[str] = Form(None), # SEEDED BUG BUG-03: Not validated as required when defect active
    country: str = Form("US"),
    payment_method: str = Form("card")
):
    session_id = get_session_id(request)
    user = get_current_user(request)
    cart = get_cart_for_session(session_id)

    if not cart:
        return RedirectResponse(url="/cart", status_code=303)

    # Seeded Defect BUG-03: Required postal code validation
    if not SEEDED_DEFECTS_STATE.get("BUG-03", True):
        if not postal_code or not postal_code.strip():
            return render_template(request, "checkout.html", {
                "default_name": fullname,
                "default_email": email,
                "cart_count": get_cart_count(session_id),
                "user": user,
                "error": "Postal / ZIP Code is required.",
                "bug04_active": SEEDED_DEFECTS_STATE.get("BUG-04", True)
            })

    # Seeded Defect BUG-04: Idempotency enforcement against duplicate submissions
    if not SEEDED_DEFECTS_STATE.get("BUG-04", True):
        now = datetime.datetime.now(datetime.timezone.utc)
        for existing_ord in reversed(db_orders):
            if existing_ord.get("session_id") == session_id and existing_ord.get("email") == email:
                try:
                    dt = datetime.datetime.fromisoformat(existing_ord["created_at"])
                    if (now - dt).total_seconds() < 5:
                        return RedirectResponse(url=f"/order-confirmation/{existing_ord['id']}", status_code=303)
                except Exception:
                    pass

    subtotal = 0.0
    for item in cart:
        prod = next((p for p in db_products if p["id"] == item["product_id"]), None)
        if prod:
            subtotal += prod["price"] * item["quantity"]
            
    total = subtotal + 15.00 + round(subtotal * 0.08, 2)

    # SEEDED BUG BUG-04: Non-idempotent order placement without duplicate check
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    new_order = {
        "id": order_id,
        "session_id": session_id,
        "fullname": fullname,
        "email": email,
        "address": address,
        "city": city,
        "postal_code": postal_code or "",
        "country": country,
        "payment_method": payment_method,
        "total": total,
        "items": [dict(i) for i in cart],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    db_orders.append(new_order)

    # Empty cart
    db_carts[session_id] = []

    response = RedirectResponse(url=f"/order-confirmation/{order_id}", status_code=303)
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/order-confirmation/{order_id}", response_class=HTMLResponse)
async def order_confirmation(order_id: str, request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    order = next((o for o in db_orders if o["id"] == order_id), None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    response = render_template(request, "order_confirmation.html", {
        "order": order,
        "cart_count": get_cart_count(session_id),
        "user": user
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    response = render_template(request, "register.html", {
        "cart_count": get_cart_count(session_id),
        "user": user,
        "error": None,
        "success": None
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/register")
async def register_user(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...)
):
    session_id = get_session_id(request)
    
    if password != confirm_password:
        return render_template(request, "register.html", {
            "cart_count": get_cart_count(session_id),
            "user": None,
            "error": "Passwords do not match.",
            "success": None
        })

    # Seeded Defect BUG-01: Faulty email validation
    if SEEDED_DEFECTS_STATE.get("BUG-01", True):
        if len(email) < 3:
            return render_template(request, "register.html", {
                "cart_count": get_cart_count(session_id),
                "user": None,
                "error": "Please provide a valid email address.",
                "success": None
            })
    else:
        # Fixed BUG-01: Strict email regex format check
        import re
        if not re.match(r"^[\w\.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$", email):
            return render_template(request, "register.html", {
                "cart_count": get_cart_count(session_id),
                "user": None,
                "error": "Please provide a valid email address with @ and domain.",
                "success": None
            })

    db_users[email] = {
        "name": name,
        "email": email,
        "password": password,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    response = render_template(request, "register.html", {
        "cart_count": get_cart_count(session_id),
        "user": None,
        "error": None,
        "success": f"Account created for {email}! You can now sign in."
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    response = render_template(request, "login.html", {
        "cart_count": get_cart_count(session_id),
        "user": user,
        "error": None
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/login")
async def login_user(
    request: Request,
    email: str = Form(...),
    password: str = Form(...)
):
    session_id = get_session_id(request)
    user = db_users.get(email)
    if not user or user["password"] != password:
        return render_template(request, "login.html", {
            "cart_count": get_cart_count(session_id),
            "user": None,
            "error": "Invalid email or password."
        })

    response = RedirectResponse(url="/account", status_code=303)
    response.set_cookie(key="devstore_session", value=session_id)
    response.set_cookie(key="devstore_user", value=email)
    return response

@app.get("/logout")
async def logout(request: Request):
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie(key="devstore_user")
    return response

# SEEDED BUG BUG-05: Broken Access Control on /account
@app.get("/account", response_class=HTMLResponse)
async def customer_account(request: Request):
    session_id = get_session_id(request)
    user = get_current_user(request)
    
    # If defect BUG-05 is fixed: enforce authentication redirect
    if not SEEDED_DEFECTS_STATE.get("BUG-05", True):
        if not user:
            return RedirectResponse(url="/login?redirect=/account", status_code=303)

    response = render_template(request, "account.html", {
        "cart_count": get_cart_count(session_id),
        "user": user,
        "orders": [
            {"id": "ORD-1092", "date": "2026-03-12", "total": "$219.98", "status": "Delivered"},
            {"id": "ORD-1088", "date": "2026-03-01", "total": "$49.99", "status": "Delivered"}
        ]
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

# ----------------- Assessment Platform Benchmark Endpoints -----------------

@app.get("/assessment", response_class=HTMLResponse)
async def assessment_home(request: Request):
    """Candidate assignment landing portal."""
    session_id = get_session_id(request)
    user = get_current_user(request)
    response = render_template(request, "assessment_home.html", {
        "cart_count": get_cart_count(session_id),
        "user": user,
        "candidate_name": "Jordan Reed",
        "candidate_email": "jordan.reed@example.com"
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/assessment/start", response_class=HTMLResponse)
async def assessment_start(
    request: Request,
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    access_code: str = Form(...)
):
    """
    Candidate access code validation.
    SEEDED DEFECT ASSESS-05: Missing validation accepts 1-character malformed code.
    """
    session_id = get_session_id(request)
    code_clean = access_code.strip()

    # If ASSESS-05 is enabled: defective length-only validation accepts malformed 1-char codes
    if SEEDED_DEFECTS_STATE.get("ASSESS-05", True):
        is_valid = len(code_clean) >= 1
    else:
        # Proper validation requires formatted 6-char invitation code
        is_valid = len(code_clean) >= 6 and "-" in code_clean

    if not is_valid:
        return render_template(request, "assessment_home.html", {
            "error": "Invalid assessment access code. Format requires 6-character invitation key (e.g. AIM-2026).",
            "candidate_name": candidate_name,
            "candidate_email": candidate_email
        })

    # Initialize candidate session
    db_candidate_sessions[session_id] = {
        "name": candidate_name,
        "email": candidate_email,
        "code": code_clean,
        "answers": {"q1": "B", "q2": "A", "q3": "A"} # seeded defaults
    }

    response = RedirectResponse(url="/assessment/test", status_code=303)
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/assessment/test", response_class=HTMLResponse)
async def assessment_test(request: Request):
    """
    Candidate examination view.
    SEEDED DEFECT ASSESS-01: Page reload wipes answered radio selections from state.
    """
    session_id = get_session_id(request)
    candidate = db_candidate_sessions.get(session_id, {
        "name": "Jordan Reed",
        "email": "jordan.reed@example.com",
        "answers": {"q1": "B", "q2": "A", "q3": "A"}
    })

    # If refresh simulated:
    is_refresh = request.query_params.get("refresh") == "1"
    if is_refresh and SEEDED_DEFECTS_STATE.get("ASSESS-01", True):
        # Defective behavior: Session answer state lost on refresh
        candidate["answers"] = {}
        db_candidate_sessions[session_id] = candidate

    response = render_template(request, "assessment_exam.html", {
        "candidate": candidate,
        "answers": candidate.get("answers", {}),
        "cart_count": get_cart_count(session_id),
        "user": get_current_user(request)
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.post("/assessment/submit", response_class=HTMLResponse)
async def assessment_submit(
    request: Request,
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    q1: Optional[str] = Form(None),
    q2: Optional[str] = Form(None),
    q3: Optional[str] = Form(None)
):
    """
    Assessment submission and scoring.
    SEEDED DEFECT ASSESS-02: Non-idempotent submission creates duplicate results on double submit.
    SEEDED DEFECT ASSESS-03: Score calculation arithmetic bug displays 33% instead of 100%.
    """
    session_id = get_session_id(request)
    
    # 1. Answer Key Evaluation (Answer Key: q1=B, q2=A, q3=A)
    submitted = {"q1": q1, "q2": q2, "q3": q3}
    key = {"q1": "B", "q2": "A", "q3": "A"}
    correct = sum(1 for q, ans in submitted.items() if ans == key.get(q))
    total = len(key)

    # 2. Score Calculation Defect (ASSESS-03)
    if SEEDED_DEFECTS_STATE.get("ASSESS-03", True):
        # Defective logic: reports 33% when all 3 answers are correct
        score_percent = "33%" if correct == 3 else f"{int(correct / total * 100)}%"
    else:
        score_percent = f"{int(correct / total * 100)}%"

    # 3. Idempotency Defect (ASSESS-02)
    # Check if duplicate submission already recorded
    recent_dup = [s for s in db_assessment_submissions if s["candidate_email"] == candidate_email]
    if not SEEDED_DEFECTS_STATE.get("ASSESS-02", True):
        # Fixed behavior: idempotent submission does not duplicate
        if recent_dup:
            submission_id = recent_dup[-1]["submission_id"]
            return render_template(request, "assessment_result.html", {
                "submission_id": submission_id,
                "candidate_name": candidate_name,
                "candidate_email": candidate_email,
                "score_percent": recent_dup[-1]["score_percent"],
                "correct_count": correct,
                "total_questions": total
            })

    submission_id = f"SUB-{uuid.uuid4().hex[:6].upper()}"
    new_sub = {
        "submission_id": submission_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "score_percent": score_percent,
        "submitted_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    db_assessment_submissions.append(new_sub)

    response = render_template(request, "assessment_result.html", {
        "submission_id": submission_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "score_percent": score_percent,
        "correct_count": correct,
        "total_questions": total
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

@app.get("/assessment/recruiter/results", response_class=HTMLResponse)
async def recruiter_results(request: Request):
    """
    Recruiter candidate evaluation view.
    SEEDED DEFECT ASSESS-04: Broken Access Control leaks candidate results to anonymous visitors.
    """
    session_id = get_session_id(request)
    user = get_current_user(request)

    # If defect ASSESS-04 is fixed: enforce recruiter login
    if not SEEDED_DEFECTS_STATE.get("ASSESS-04", True):
        if not user or user.get("email") != "recruiter@apexqa.io":
            return RedirectResponse(url="/login?redirect=/assessment/recruiter/results", status_code=303)

    response = render_template(request, "assessment_recruiter.html", {
        "submissions": db_assessment_submissions,
        "cart_count": get_cart_count(session_id),
        "user": user
    })
    response.set_cookie(key="devstore_session", value=session_id)
    return response

# ----------------- Control & Reset Endpoints -----------------

@app.get("/api/defects")
async def get_defects_status():
    """Returns the state of all 5 seeded defects (True = defective, False = fixed)."""
    return {
        "status": "success",
        "defects": SEEDED_DEFECTS_STATE,
        "all_defects_enabled": all(SEEDED_DEFECTS_STATE.values())
    }

@app.post("/api/defects/toggle")
async def toggle_defects(request: Request):
    """
    Toggles all defects or a specific defect.
    Body JSON or Form: {"enabled": false} or {"defect_id": "BUG-01", "enabled": false}
    """
    try:
        data = await request.json()
    except Exception:
        try:
            form = await request.form()
            data = dict(form)
        except Exception:
            data = {}

    if "defect_id" in data:
        d_id = str(data["defect_id"]).upper()
        if d_id in SEEDED_DEFECTS_STATE:
            SEEDED_DEFECTS_STATE[d_id] = bool(data.get("enabled", not SEEDED_DEFECTS_STATE[d_id]))
    elif "enabled" in data:
        val = str(data["enabled"]).lower() in ("true", "1", "yes")
        for k in SEEDED_DEFECTS_STATE:
            SEEDED_DEFECTS_STATE[k] = val
    else:
        current = all(SEEDED_DEFECTS_STATE.values())
        for k in SEEDED_DEFECTS_STATE:
            SEEDED_DEFECTS_STATE[k] = not current

    return {
        "status": "success",
        "defects": SEEDED_DEFECTS_STATE,
        "all_defects_enabled": all(SEEDED_DEFECTS_STATE.values())
    }

@app.post("/api/reset")
async def reset_demo_state():
    """Resets the demo state back to default synthetic data."""
    global db_products, db_users, db_carts, db_orders, db_assessment_submissions, db_candidate_sessions
    db_products = [dict(p) for p in INITIAL_PRODUCTS]
    db_users = {k: dict(v) for k, v in INITIAL_USERS.items()}
    db_carts = {}
    db_orders = []
    db_assessment_submissions = list(INITIAL_ASSESSMENT_SUBMISSIONS)
    db_candidate_sessions = {}
    for k in SEEDED_DEFECTS_STATE:
        SEEDED_DEFECTS_STATE[k] = True
    return {"status": "success", "message": "Demo state reset to synthetic defaults."}

@app.get("/api/state")
async def get_demo_state():
    """Returns state metrics for test oracles and assertions."""
    return {
        "products_count": len(db_products),
        "users_count": len(db_users),
        "orders_count": len(db_orders),
        "carts_active": len(db_carts),
        "defects": SEEDED_DEFECTS_STATE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=5001, reload=True)
