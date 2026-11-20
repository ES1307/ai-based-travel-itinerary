from planner import generate_itinerary


def main():
    city = input("Enter city: ").strip()
    days = int(input("Enter number of days: ").strip())
    budget = input("Enter budget (economical/moderate/luxury): ").strip()
    style = input("Enter travel style (relaxed/mild/fast): ").strip()
    interests = input("Enter interests (comma separated): ").strip()

    user_input = {
        "city": city,
        "days": days,
        "budget": budget,
        "style": style,
        "interests": interests,
    }

    result = generate_itinerary(user_input)

    itinerary = result.get("itinerary", {})
    notice = result.get("notice", "")

    print("\nYour Travel Itinerary:\n")

    if notice:
        print(notice)
        print()

    for day, places in itinerary.items():
        print(day)

        if not places:
            print("  - Free day — feel free to roam and explore the city on your own.")
            print()
            continue

        for place in places:
            print(
                f"  - {place['name']} "
                f"({place['category']}, budget: {place['budget']}, "
                f"rating: {place['rating']}, score: {place['score']})"
            )
        print()


if __name__ == "__main__":
    main()
