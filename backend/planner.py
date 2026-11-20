import json
from pathlib import Path

DATA_FILE = Path(__file__).with_name("places.json")

BUDGET_ORDER = {
    "economical": 0,
    "moderate": 1,
    "luxury": 2,
}

PLACES_PER_DAY = {
    "relaxed": 2,
    "mild": 3,
    "fast": 4,
}

RELATED_CATEGORIES = {
    "history": {"history", "spiritual"},
    "art": {"art", "history"},
    "food": {"food", "shopping"},
    "nature": {"nature", "spiritual"},
    "nightlife": {"nightlife", "food", "shopping"},
}


def normalize(value):
    return str(value or "").strip().lower()


def title_case(value):
    return str(value or "").strip().title()


def parse_interests(interests):
    if isinstance(interests, str):
        items = interests.split(",")
    else:
        items = interests or []
    return [normalize(item) for item in items if normalize(item)]


def load_places():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Could not find {DATA_FILE.resolve()}")
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def budget_rank(budget):
    return BUDGET_ORDER.get(normalize(budget), 1)


def get_places_per_day(style):
    return PLACES_PER_DAY.get(normalize(style), 3)


def match_interest(place_category, interests):
    place_category = normalize(place_category)

    for index, interest in enumerate(interests):
        if place_category == interest:
            return True, index, 0, interest

        related = RELATED_CATEGORIES.get(interest, {interest})
        if place_category in related:
            return True, index, 1, interest

    return False, None, 9, None


def score_place(place, interests, user_budget):
    category = normalize(place.get("category"))
    budget = normalize(place.get("budget"))
    rating = float(place.get("rating", 0))

    if budget_rank(budget) > budget_rank(user_budget):
        return None

    matched, interest_index, match_strength, matched_interest = match_interest(category, interests)

    item = place.copy()
    item["matched"] = matched
    item["interest_index"] = interest_index
    item["match_strength"] = match_strength
    item["matched_interest"] = matched_interest
    item["budget_rank"] = budget_rank(budget)
    item["score"] = 0.0

    if matched:
        score = 0.0
        score += 100 if match_strength == 0 else 70
        score += 50 - (interest_index * 5)
        score += rating * 5
        score += 20 if budget_rank(budget) == budget_rank(user_budget) else 10
        item["score"] = round(score, 2)
    else:
        score = rating * 5
        score += 20 if budget_rank(budget) == budget_rank(user_budget) else 10
        item["score"] = round(score, 2)

    return item


def rank_places(places, interests, user_budget):
    exact_matches = []
    related_matches = []
    remaining_places = []

    for place in places:
        item = score_place(place, interests, user_budget)
        if item is None:
            continue

        if item["matched"]:
            if item["match_strength"] == 0:
                exact_matches.append(item)
            else:
                related_matches.append(item)
        else:
            remaining_places.append(item)

    exact_matches.sort(
        key=lambda x: (
            x["interest_index"],
            -float(x.get("rating", 0)),
            -float(x.get("score", 0)),
            x.get("name", ""),
        )
    )

    related_matches.sort(
        key=lambda x: (
            x["interest_index"],
            -float(x.get("rating", 0)),
            -float(x.get("score", 0)),
            x.get("name", ""),
        )
    )

    remaining_places.sort(
        key=lambda x: (
            -float(x.get("rating", 0)),
            -float(x.get("score", 0)),
            x.get("name", ""),
        )
    )

    return exact_matches + related_matches + remaining_places


def build_day_plan(selected_places, start_index, count):
    day_plan = []
    total = len(selected_places)

    for offset in range(count):
        idx = start_index + offset
        if idx >= total:
            break
        day_plan.append(selected_places[idx].copy())

    return day_plan


def generate_itinerary(user_input):
    city = title_case(user_input.get("city"))
    days = int(user_input.get("days", 1))
    budget = normalize(user_input.get("budget", "moderate"))
    style = normalize(user_input.get("style", "mild"))
    interests = parse_interests(user_input.get("interests", []))

    if days < 1:
        raise ValueError("Number of days must be at least 1.")

    if budget not in BUDGET_ORDER:
        raise ValueError("Budget must be economical, moderate, or luxury.")

    if style not in PLACES_PER_DAY:
        style = "mild"

    if not interests:
        raise ValueError("Please provide at least one interest.")

    all_places = load_places()
    city_places = [p for p in all_places if normalize(p.get("city")) == normalize(city)]

    if not city_places:
        raise ValueError(f"No places found for city '{city}'.")

    ranked = rank_places(city_places, interests, budget)

    per_day = get_places_per_day(style)
    total_slots = days * per_day
    selected = ranked[:total_slots]

    itinerary = []
    for day in range(days):
        start_index = day * per_day
        day_places = build_day_plan(selected, start_index, per_day)

        itinerary.append({
            "day": day + 1,
            "label": f"Day {day + 1}",
            "places": day_places,
            "is_free_day": len(day_places) == 0,
        })

    notice = ""
    if len(selected) < total_slots:
        notice = (
            "You can feel free to roam and explore the city on your own, "
            "as there are almost no places left to plan..."
        )

    covered_interests = []
    for place in selected:
        matched_interest = place.get("matched_interest")
        if matched_interest and matched_interest not in covered_interests:
            covered_interests.append(matched_interest)

    return {
        "itinerary": itinerary,
        "notice": notice,
        "covered_interests": covered_interests,
    }
