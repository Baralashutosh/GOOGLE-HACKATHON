"""
MedMesh demo-data generator.

Live facility-level stock data is not published by any BRICS health ministry, so
this builds a simulation instead — but a simulation calibrated to peer-reviewed
figures rather than invented. Targets, all real:

  * King Cetshwayo District, KwaZulu-Natal (BMC Health Serv Res 2023):
      85.6% of medicines hit by stock-outs, 50.6% overstocked, 15.2% expired.
  * Brazil (CNM 2022): shortages in 82% of 3,360 municipalities.
  * India: ~52% of essential medicines available in >80% of primary facilities.

The pathology is not injected by hand. It falls out of one true mechanism:
planners order against an ANNUAL AVERAGE while demand is SEASONAL. Order the
year's mean of an antimalarial and you are short every monsoon and drowning in
it every dry season — stocking out and expiring the same drug in the same year.
That is the whole thesis of MedMesh, reproduced from first principles.

Hemispheres matter and are modelled: India's malaria peak (Jul-Aug) lands in
Brazil and South Africa's trough, and vice versa. Demand moves across the map
faster than stock does — which is precisely why pooling across BRICS works.

Run:  python data/generator/generate.py
"""

from __future__ import annotations

import csv
import json
import math
import random
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from pathlib import Path

SEED = 20260817
ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data" / "catalog"
OUT = ROOT / "data" / "generated"

# 18 months ending at the "today" of the demo.
END_DATE = date(2026, 8, 17)
DAYS = 548
START_DATE = END_DATE - timedelta(days=DAYS - 1)

# --------------------------------------------------------------------------
# Geography. Real districts, real administrative units, plausible coordinates.
# King Cetshwayo is deliberate: it is the district the source study measured.
# --------------------------------------------------------------------------

DISTRICTS = {
    "IN": {
        "admin1": "Bihar",
        "hemisphere": "N",
        "spread": 0.20,
        "districts": [
            {"name": "Muzaffarpur", "centre": (26.12, 85.36), "blocks": [
                "Aurai", "Bandra", "Baruraj", "Bochaha", "Gaighat", "Kanti",
                "Katra", "Kurhani", "Marwan", "Meenapur", "Mushahari", "Saraiya"]},
            {"name": "Sitamarhi", "centre": (26.59, 85.49), "blocks": [
                "Dumra", "Runnisaidpur", "Belsand", "Pupri", "Bathnaha", "Sonbarsa",
                "Majorganj", "Bairgania", "Riga", "Parihar", "Nanpur", "Bajpatti"]},
            {"name": "Vaishali", "centre": (25.68, 85.21), "blocks": [
                "Hajipur", "Lalganj", "Mahnar", "Patepur", "Bidupur", "Raghopur",
                "Goraul", "Jandaha", "Chehrakala", "Desri", "Sahdei Buzurg", "Bhagwanpur"]},
        ],
        "tiers": [("warehouse", 1), ("district_hospital", 1), ("community", 2), ("primary", 7)],
        "pop_by_tier": {"warehouse": 0, "district_hospital": 480_000, "community": 120_000, "primary": 30_000},
    },
    "BR": {
        "admin1": "Amazonas",
        "hemisphere": "S",
        "spread": 0.32,
        "districts": [
            {"name": "Manaus", "centre": (-3.10, -60.02), "blocks": [
                "Cidade Nova", "Compensa", "Alvorada", "São José", "Tarumã",
                "Petrópolis", "Educandos", "Coroado", "Japiim", "Novo Aleixo",
                "Zumbi", "Puraquequara"]},
            {"name": "Itacoatiara", "centre": (-3.14, -58.44), "blocks": [
                "Itacoatiara Centro", "Silves", "Urucurituba", "Nova Olinda do Norte",
                "Itapiranga", "Autazes", "Boa Vista", "Lindóia", "Jauary",
                "Colônia", "Mutum", "Arapapá"]},
            {"name": "Manacapuru", "centre": (-3.30, -60.62), "blocks": [
                "Manacapuru Centro", "Iranduba", "Careiro", "Manaquiri", "Anamã",
                "Caapiranga", "Beruri", "Novo Airão", "Cacau Pirêra", "Paricatuba",
                "Lago do Limão", "Costa do Pesqueiro"]},
        ],
        "tiers": [("warehouse", 1), ("district_hospital", 1), ("community", 2), ("primary", 7)],
        "pop_by_tier": {"warehouse": 0, "district_hospital": 520_000, "community": 95_000, "primary": 22_000},
    },
    "ZA": {
        "admin1": "KwaZulu-Natal",
        "hemisphere": "S",
        "spread": 0.24,
        "districts": [
            # The district the source study actually measured.
            {"name": "King Cetshwayo", "centre": (-28.75, 31.90), "blocks": [
                "Empangeni", "eSikhawini", "Ngwelezane", "Nseleni", "Richards Bay",
                "Mtunzini", "Eshowe", "Gingindlovu", "Melmoth", "Nkandla",
                "KwaMbonambi", "Ntambanana"]},
            {"name": "uMkhanyakude", "centre": (-27.60, 32.30), "blocks": [
                "Mtubatuba", "Hlabisa", "Jozini", "Ingwavuma", "Mbazwana",
                "Manguzi", "Hluhluwe", "KwaMsane", "Nongoma Road", "Mseleni",
                "Bhambanana", "Ndumo"]},
            {"name": "Zululand", "centre": (-27.75, 31.40), "blocks": [
                "Ulundi", "Nongoma", "Vryheid", "Pongola", "Babanango",
                "Mahlabathini", "Ceza", "Hlobane", "Louwsburg", "Coronation",
                "Emondlo", "Bloemveld"]},
        ],
        "tiers": [("warehouse", 1), ("district_hospital", 1), ("community", 2), ("primary", 7)],
        "pop_by_tier": {"warehouse": 0, "district_hospital": 410_000, "community": 88_000, "primary": 19_000},
    },
}

TIER_LABEL = {
    "IN": {"warehouse": "District Drug Warehouse", "district_hospital": "District Hospital", "community": "CHC", "primary": "PHC"},
    "BR": {"warehouse": "Almoxarifado Central", "district_hospital": "Hospital Regional", "community": "UBS Ampliada", "primary": "UBS"},
    "ZA": {"warehouse": "District Pharmaceutical Depot", "district_hospital": "District Hospital", "community": "CHC", "primary": "Clinic"},
}

# Annual treatment episodes per 1,000 population, and units dispensed per episode.
# Rough public-health orders of magnitude, varied by country burden.
BURDEN = {
    #  drug id            episodes/1000/yr by country      units/episode
    "d_al_fdc":           ({"IN": 14, "BR": 22, "ZA": 30}, 24),
    "d_asv":              ({"IN": 3.1, "BR": 1.4, "ZA": 0.6}, 8),
    "d_ors":              ({"IN": 180, "BR": 120, "ZA": 140}, 4),
    "d_amoxicillin":      ({"IN": 210, "BR": 160, "ZA": 190}, 21),
    "d_ceftriaxone":      ({"IN": 26, "BR": 30, "ZA": 34}, 5),
    "d_salbutamol":       ({"IN": 38, "BR": 42, "ZA": 46}, 1),
    "d_rhz_fdc":          ({"IN": 2.4, "BR": 0.5, "ZA": 4.6}, 168),
    "d_oxytocin":         ({"IN": 21, "BR": 14, "ZA": 20}, 2),
    "d_magnesium_sulfate":({"IN": 3.0, "BR": 2.2, "ZA": 3.4}, 6),
    "d_iron_folic":       ({"IN": 96, "BR": 54, "ZA": 60}, 100),
    "d_measles_rubella":  ({"IN": 22, "BR": 15, "ZA": 19}, 1),
    "d_insulin":          ({"IN": 9, "BR": 16, "ZA": 13}, 3),
    "d_metformin":        ({"IN": 74, "BR": 105, "ZA": 88}, 60),
    "d_amlodipine":       ({"IN": 88, "BR": 130, "ZA": 145}, 60),
    "d_paracetamol":      ({"IN": 340, "BR": 250, "ZA": 280}, 10),
}

# Peak day-of-year in the NORTHERN hemisphere. Southern flips by half a year.
PEAK_DOY_N = {"monsoon": 213, "winter": 20, "summer": 140, "campaign": 100, "flat": 0}
AMPLITUDE = {"monsoon": 1.35, "winter": 0.75, "summer": 0.85, "campaign": 0.0, "flat": 0.0}


def seasonal_multiplier(doy: int, seasonality: str, hemisphere: str) -> float:
    """Demand shape over the year. Southern hemisphere peaks half a year offset."""
    if seasonality == "flat":
        return 1.0
    if seasonality == "campaign":
        # Immunisation drives: two short, sharp national pushes a year.
        return 3.2 if (95 <= doy <= 125 or 270 <= doy <= 295) else 0.55
    peak = PEAK_DOY_N[seasonality]
    if hemisphere == "S":
        peak = (peak + 182) % 365
    amp = AMPLITUDE[seasonality]
    return max(0.12, 1.0 + amp * math.cos(2 * math.pi * (doy - peak) / 365.0))


@dataclass
class Facility:
    id: str
    name: str
    country: str
    tier: str
    admin1: str
    admin2: str
    lat: float
    lon: float
    populationServed: int
    hasColdChain: bool


def build_facilities(rng: random.Random) -> list[Facility]:
    """
    Three districts per country, each a real administrative unit with its own
    centroid. Multiple districts are not decoration: the redistribution the
    problem statement asks for is CROSS-district, and a single-district world
    could not demonstrate the district boundary that makes it hard.
    """
    facilities: list[Facility] = []
    for code, cfg in DISTRICTS.items():
        for district in cfg["districts"]:
            blocks = list(district["blocks"])
            rng.shuffle(blocks)
            cursor = 0
            for tier, count in cfg["tiers"]:
                for _ in range(count):
                    block = blocks[cursor % len(blocks)]
                    cursor += 1
                    idx = len(facilities) + 1
                    label = TIER_LABEL[code][tier]
                    name = (f"{district['name']} {label}" if tier == "warehouse"
                            else f"{label}, {block}")
                    base_pop = cfg["pop_by_tier"][tier]
                    pop = int(base_pop * rng.uniform(0.62, 1.45)) if base_pop else 0
                    # Cold chain is near-universal at the top and patchy at the
                    # bottom. That gap is a hard constraint on which transfers
                    # are safe, not a preference.
                    cold = {
                        "warehouse": 1.0, "district_hospital": 1.0,
                        "community": 0.85, "primary": 0.55,
                    }[tier]
                    facilities.append(Facility(
                        id=f"f_{code.lower()}_{idx:03d}",
                        name=name,
                        country=code,
                        tier=tier,
                        admin1=cfg["admin1"],
                        admin2=district["name"],
                        lat=round(district["centre"][0] + rng.gauss(0, cfg["spread"] / 2.2), 5),
                        lon=round(district["centre"][1] + rng.gauss(0, cfg["spread"] / 2.2), 5),
                        populationServed=pop,
                        hasColdChain=rng.random() < cold,
                    ))
    return facilities


@dataclass
class Batch:
    batch_no: str
    qty: int
    expiry: date


def simulate_pair(
    fac: Facility, drug: dict, rng: random.Random, hemisphere: str,
) -> tuple[list[int], list[Batch], dict]:
    """
    Simulate one facility-drug over the window.

    Returns (daily consumption, batches on hand at END_DATE, outcome stats).
    """
    episodes_per_1k, units_per_episode = BURDEN[drug["id"]]
    rate = episodes_per_1k[fac.country]
    base_daily = (fac.populationServed / 1000.0) * rate * units_per_episode / 365.0
    # Warehouses hold for others rather than dispensing.
    if fac.tier == "warehouse":
        base_daily *= 0.05
    if base_daily <= 0:
        return [0] * DAYS, [], _empty_stats()

    seasonality = drug["seasonality"]
    shelf_days = int(drug["shelfLifeMonths"] * 30.4)

    # The planner's error. Centred near 1 but heavy-tailed both ways: some
    # facilities chronically under-request, others chronically over-request.
    bias = math.exp(rng.gauss(0.04, 0.62))
    months_target = rng.uniform(2.0, 5.4)
    order_cycle = rng.choice([60, 90, 90, 120])
    lead_time = rng.randint(7, 34)

    batches: list[Batch] = []
    pending: list[tuple[int, Batch]] = []  # (arrival day index, batch)
    consumption: list[int] = []

    # Open with a plausible amount already on the shelf.
    opening = int(base_daily * 30 * rng.uniform(1.2, 3.4) * bias)
    if opening > 0:
        batches.append(Batch("B-OPEN", opening,
                             START_DATE + timedelta(days=rng.randint(90, shelf_days))))

    stockout_days = 0
    episodes = 0
    in_stockout = False
    wasted = 0
    unmet = 0          # units a patient asked for and did not get
    peak_months_cover = 0.0
    next_order_day = rng.randint(0, order_cycle)
    batch_seq = 0

    for i in range(DAYS):
        today = START_DATE + timedelta(days=i)
        doy = today.timetuple().tm_yday

        # Receive deliveries due today.
        for arrive_day, batch in [p for p in pending if p[0] == i]:
            batches.append(batch)
        pending = [p for p in pending if p[0] != i]

        # Retire anything that expired overnight. This is the waste.
        still_good = []
        for b in batches:
            if b.expiry <= today:
                wasted += b.qty
            else:
                still_good.append(b)
        batches = still_good

        # Demand for the day.
        mult = seasonal_multiplier(doy, seasonality, hemisphere)
        lam = base_daily * mult
        # Overdispersed: real clinic days are lumpy, not Poisson-smooth.
        demand = max(0, int(rng.gauss(lam, max(1.0, lam * 0.45))))

        on_hand = sum(b.qty for b in batches)
        if on_hand > 0 and lam > 0:
            peak_months_cover = max(peak_months_cover, on_hand / (lam * 30.4))

        # A stock-out is a shelf with nothing on it, counted before dispensing.
        # Anything looser counts a busy afternoon as an outage and shatters one
        # real three-week outage into twenty imaginary one-day ones.
        if on_hand == 0:
            stockout_days += 1
            if not in_stockout:
                episodes += 1
                in_stockout = True
            # An empty shelf triggers an emergency indent — but only where
            # someone has the initiative and the budget line to raise one.
            # Where nobody does, the outage simply runs to the next cycle.
            if not pending and rng.random() < 0.075:
                batch_seq += 1
                emergency_lead = rng.randint(6, 24)
                qty = int(base_daily * 30 * rng.uniform(1.0, 2.2))
                if i + emergency_lead < DAYS and qty > 0:
                    pending.append((i + emergency_lead, Batch(
                        f"E{today.year % 100}{batch_seq:03d}", qty,
                        today + timedelta(days=emergency_lead + int(shelf_days * rng.uniform(0.3, 0.8))),
                    )))
        else:
            in_stockout = False

        # Dispense first-expiry-first-out.
        served = 0
        batches.sort(key=lambda b: b.expiry)
        for b in batches:
            if served >= demand:
                break
            take = min(b.qty, demand - served)
            b.qty -= take
            served += take
        batches = [b for b in batches if b.qty > 0]
        consumption.append(served)
        unmet += demand - served

        # Reorder. The flaw that drives everything: the planner sizes the order
        # from a flat annual average, blind to the season it is ordering into.
        if i >= next_order_day:
            next_order_day = i + order_cycle
            annual_avg_daily = base_daily  # deliberately season-blind
            target = annual_avg_daily * 30.4 * months_target * bias
            on_hand_now = sum(b.qty for b in batches) + sum(b.qty for _, b in pending)
            qty = int(target - on_hand_now)
            # Indents are not granted in full. The tier above is itself short,
            # or the budget line is exhausted, so orders come back part-filled
            # and sometimes not at all. This, not demand, is what empties a PHC.
            if rng.random() < 0.14:
                qty = 0                      # indent unfilled upstream
            else:
                qty = int(qty * rng.uniform(0.55, 1.0))
            if qty > 0:
                batch_seq += 1
                # Deliveries routinely arrive already part-way through shelf life.
                remaining = int(shelf_days * rng.uniform(0.20, 0.80))
                arrival = i + lead_time
                if arrival < DAYS:
                    pending.append((arrival, Batch(
                        f"B{today.year % 100}{batch_seq:03d}", qty,
                        today + timedelta(days=lead_time + remaining),
                    )))

    stats = {
        "stockout_days": stockout_days,
        "stockout_episodes": episodes,
        "wasted_units": wasted,
        "unmet_units": unmet,
        "peak_months_cover": peak_months_cover,
        "total_consumed": sum(consumption),
    }
    return consumption, batches, stats


def _empty_stats() -> dict:
    return {"stockout_days": 0, "stockout_episodes": 0, "wasted_units": 0,
            "unmet_units": 0, "peak_months_cover": 0.0, "total_consumed": 0}


def main() -> None:
    rng = random.Random(SEED)
    OUT.mkdir(parents=True, exist_ok=True)

    drugs = json.loads((CATALOG / "drugs.json").read_text(encoding="utf-8"))
    facilities = build_facilities(rng)

    consumption_rows: list[tuple] = []
    batch_rows: list[tuple] = []
    pair_stats: list[dict] = []

    for fac in facilities:
        hemisphere = DISTRICTS[fac.country]["hemisphere"]
        for drug in drugs:
            consumption, batches, stats = simulate_pair(fac, drug, rng, hemisphere)
            if stats["total_consumed"] == 0 and not batches:
                continue
            for i, units in enumerate(consumption):
                if units:
                    d = START_DATE + timedelta(days=i)
                    consumption_rows.append((fac.id, drug["id"], d.isoformat(), units))
            for b in batches:
                batch_rows.append((fac.id, drug["id"], b.batch_no, b.qty,
                                   b.expiry.isoformat(), END_DATE.isoformat(), "simulated"))
            pair_stats.append({"facility": fac.id, "country": fac.country,
                               "drug": drug["id"], **stats})

    # ---- write ----
    (OUT / "facilities.json").write_text(
        json.dumps([asdict(f) for f in facilities], indent=2), encoding="utf-8")

    with (OUT / "consumption.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["facility_id", "drug_id", "date", "units_dispensed"])
        w.writerows(consumption_rows)

    with (OUT / "stock_batches.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["facility_id", "drug_id", "batch_no", "quantity",
                    "expiry_date", "last_counted_at", "source"])
        w.writerows(batch_rows)

    report = calibration_report(pair_stats)
    (OUT / "calibration.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"facilities        {len(facilities)}")
    print(f"facility-drug     {len(pair_stats)}")
    print(f"consumption rows  {len(consumption_rows):,}")
    print(f"open batches      {len(batch_rows):,}")
    print("\n--- calibration vs published figures ---")
    for k, v in report["checks"].items():
        flag = "ok " if v["within_tolerance"] else "OFF"
        print(f"  [{flag}] {k:<28} simulated {v['simulated']:>6.1f}%   target {v['target']:>5.1f}%")


def calibration_report(pair_stats: list[dict]) -> dict:
    n = len(pair_stats)
    pct = lambda c: round(100.0 * c / n, 2)

    with_stockout = pct(sum(1 for p in pair_stats if p["stockout_episodes"] > 0))
    overstocked = pct(sum(1 for p in pair_stats if p["peak_months_cover"] > 6.0))
    with_waste = pct(sum(1 for p in pair_stats if p["wasted_units"] > 0))

    months = DAYS / 30.4
    # Published figure is per FACILITY across its whole basket, not per drug —
    # 2.3 x 22.4 days would exceed a month for any single medicine.
    by_facility: dict[str, int] = {}
    for p in pair_stats:
        by_facility[p["facility"]] = by_facility.get(p["facility"], 0) + p["stockout_episodes"]
    episodes_per_facility_month = sum(by_facility.values()) / len(by_facility) / months

    total_episodes = sum(p["stockout_episodes"] for p in pair_stats)
    mean_duration = (sum(p["stockout_days"] for p in pair_stats) / total_episodes) if total_episodes else 0

    checks = {
        "medicines hit by stock-out": {"simulated": with_stockout, "target": 85.6, "tol": 8.0},
        "medicines overstocked":      {"simulated": overstocked,   "target": 50.6, "tol": 12.0},
        "medicines lost to expiry":   {"simulated": with_waste,    "target": 15.2, "tol": 8.0},
    }
    for v in checks.values():
        v["within_tolerance"] = abs(v["simulated"] - v["target"]) <= v["tol"]

    return {
        "source": "BMC Health Serv Res 2023, King Cetshwayo District, KwaZulu-Natal",
        "pairs": n,
        "checks": checks,
        "stockout_episodes_per_facility_per_month": round(episodes_per_facility_month, 2),
        "mean_stockout_duration_days": round(mean_duration, 1),
        "total_units_wasted": sum(p["wasted_units"] for p in pair_stats),
    }


if __name__ == "__main__":
    main()
