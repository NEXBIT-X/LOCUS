# Locus

pitch deck : [LINK](https://docs.google.com/presentation/d/1GME8JNXbEJsT5j5TEH5E5DR62vINkOrU/edit?usp=sharing&ouid=106613689610271939981&rtpof=true&sd=true)

**submission for guidewire devtrails 2026**

**Parametric Income Protection for India's Gig Delivery Workers**

> When it rains on a thursday evening in chennai, a zepto partner does not just lose one order. they lose their peak slot, their weekly incentive slab, and sometimes the ability to cover rent that week. the platform charges the customer a rain surcharge. the worker absorbs the loss entirely. locus is built to fix that specific injustice.

---

## the problem

fifteen lakh delivery workers run this country's quick commerce economy. they work without contracts, without employer benefits, and without any income protection that understands how they actually earn money.

when a disruption hits — rain, a curfew, flooding, a local bandh — they lose income they cannot recover. not because they made a bad decision. because the sky had a bad day.

traditional insurance was not built for this. it assumes monthly salaries, tax documents, and bank statements. the gig worker has none of these things. what they have is a phone, a weekly payout, and a disruption that does not wait.

zomato and swiggy have both acknowledged rain costs workers money — they charge customers a surcharge for it. that money does not reach the worker in any reliable form. it gets absorbed elsewhere.

locus closes that gap.

```mermaid
graph TD
    A[Disruption hits the city] --> B[Platform bills customer ₹35 rain surcharge]
    A --> C[Delivery partner loses their evening peak window]
    B --> D[Surcharge absorbed into platform margin]
    C --> E[Worker goes home ₹800 short with no recourse]
    E --> F[Misses rent. Skips meals. Borrows from family.]
    D --> G[No income protection product exists for this scenario]
    F --> G
    G --> H[Locus is that product]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style H fill:#0f3460,stroke:#e94560,color:#fff
    style F fill:#16213e,stroke:#e94560,color:#fff
```

---

## what locus does

locus is a parametric income protection platform with an embedded credit facility. when an external disruption crosses a threshold in a worker's active zone, locus detects it and initiates a payout or credit advance automatically. no action required from the worker.

no claim forms. no documents. no waiting. the money arrives before they think to ask for it.

the product operates on two layers depending on severity. severe events like declared floods or citywide curfews trigger a direct payout between ₹500 and ₹1000 with no repayment. moderate events like heavy rain or local strikes trigger a credit advance between ₹200 and ₹500, repaid gradually through future earnings at ₹50 to ₹100 per week. consistent repayment over six months builds a formal credit history — something most gig workers do not have anywhere in the financial system today.

```mermaid
sequenceDiagram
    participant W as Delivery Partner
    participant L as Locus Platform
    participant API as Weather and Event APIs
    participant UPI as UPI Gateway

    API->>L: Rainfall crosses 15mm/hr threshold in Zone 4B
    L->>L: Pull all active workers in Zone 4B
    L->>L: Cross-reference earning fingerprint
    L->>L: Calculate time-weighted income loss
    L->>L: Run multi-signal fraud validation
    L->>UPI: Initiate payout ₹800
    UPI->>W: Payment credited to account
    Note over W,L: Worker never opened the app.<br/>Money arrived before they knew a claim existed.
```

---

## persona

**Grocery and Quick-Commerce Delivery Partners**
zepto, blinkit, swiggy instamart

this segment runs on ten-minute delivery windows. it is the most weather-sensitive delivery category in india. workers are concentrated in dense urban pincodes which makes hyperlocal risk modeling viable in a way that city-level weather data simply cannot support.

```mermaid
graph LR
    subgraph Worker Reality
        A[Net weekly income: ₹4,700 average]
        B[Peak window: 6pm to 10pm on weekdays]
        C[One bad rain week costs: ₹1,000 to ₹1,500]
        D[Full weekly premium: ₹60]
        E[Worst-case return on premium: 20x]
    end

    A --> C
    C --> D
    D --> E

    style A fill:#0f3460,stroke:#533483,color:#fff
    style E fill:#0f3460,stroke:#e94560,color:#fff
```

---

## weekly premium model

gig workers get paid weekly. they spend weekly. a monthly premium model creates a mismatch that kills adoption before it starts. locus is structured to match their actual financial cycle.

| component | weekly amount | what it covers |
|---|---|---|
| insurance premium | ₹40 | direct payouts for severe disruptions |
| credit reserve contribution | ₹20 | personal credit pool for moderate events |
| **total** | **₹60** | full income protection both layers |

the ₹60 base adjusts every monday based on three inputs specific to that worker.

```mermaid
flowchart TD
    A[Monday — Weekly Premium Recalculation] --> B[Zone Risk Score]
    A --> C[Earning Fingerprint]
    A --> D[7-Day Forecast]

    B --> B1[Pincode-level flood and weather history\nTwo years of data per zone\nUpdates monthly]
    C --> C1[Worker's actual active hours mapped\nDisruption at 7pm Friday costs more\nthan disruption at 2am Tuesday]
    D --> D1[Rainfall probability, AQI forecast\nStrike and event calendar\nHigh risk week triggers auto-upgrade]

    B1 --> E[Premium calculated for this specific worker this week]
    C1 --> E
    D1 --> E

    E --> F[Low risk zone off-peak worker: ₹35]
    E --> G[Standard worker average zone: ₹60]
    E --> H[Flood-prone zone peak monsoon: ₹85]

    style A fill:#1a1a2e,stroke:#533483,color:#fff
    style E fill:#0f3460,stroke:#e94560,color:#fff
```

---

## parametric triggers

every trigger is monitored continuously. no human touches the claims pipeline at any point.

| trigger | threshold | response | layer |
|---|---|---|---|
| rainfall | above 15mm per hour sustained 2+ hours | credit advance ₹200–500 | 2 |
| flooding | IMD flood alert active in worker pincode | direct payout ₹500–1000 | 1 |
| air quality | AQI above 400 for 4+ hours | credit advance ₹200–500 | 2 |
| curfew | government declared any duration | direct payout ₹500–1000 | 1 |
| local strike | zone closure over 3 hours | credit advance ₹200–500 | 2 |
| compounding | two or more triggers active simultaneously | auto coverage upgrade | both |

```mermaid
stateDiagram-v2
    [*] --> Monitoring: system running continuously

    Monitoring --> SingleTrigger: one threshold crossed
    Monitoring --> CompoundTrigger: two or more thresholds crossed

    SingleTrigger --> Layer1: severe event flood or curfew
    SingleTrigger --> Layer2: moderate event rain strike AQI

    CompoundTrigger --> AutoUpgrade: coverage upgraded automatically
    AutoUpgrade --> Layer1

    Layer1 --> DirectPayout: 500 to 1000 rupees via UPI no repayment
    Layer2 --> CreditAdvance: 200 to 500 rupees repaid through earnings

    DirectPayout --> [*]: worker notified after payment lands
    CreditAdvance --> RepaymentEngine: 50 to 100 deducted from future weekly earnings
    RepaymentEngine --> [*]: credit history builds over time
```

---

## the silent claims pipeline

the worker never files a claim. the system detects, validates, and pays without any input from the worker. this is the entire point.

```mermaid
flowchart TD
    A[Disruption threshold crossed] --> B[Identify workers in affected pincode]
    B --> C[Check earning fingerprint\nwere they scheduled to work this window]
    C --> D[Calculate income lost\ntime-weighted against their peak hours]
    D --> E[Multi-signal fraud validation]

    E --> F{Confidence Score}

    F -->|above 85 percent| G[Auto approve\ninstant payout]
    F -->|50 to 85 percent| H[Soft flag\n2-hour hold\npassive verification]
    F -->|below 50 percent| I[Hard flag\n24-hour manual review]

    H -->|verified| G
    H -->|no response after 2 hours| G
    I -->|review passes| G
    I -->|review fails| J[Claim rejected\nworker notified with specific reason]

    G --> K[UPI payout initiated]
    K --> L[Worker notification sent]
    L --> M[Full audit log recorded]

    style A fill:#1a1a2e,stroke:#533483,color:#fff
    style G fill:#0f3460,stroke:#00b4d8,color:#fff
    style J fill:#1a1a2e,stroke:#e94560,color:#fff
```

---

## AI and ML architecture

```mermaid
graph TD
    subgraph inputs
        A1[Platform activity logs]
        A2[Historical weather by pincode]
        A3[Worker schedule patterns]
        A4[Claim and repayment history]
        A5[Local event and strike calendar]
    end

    subgraph models
        B1[Earning Fingerprint\nhourly and daily income prediction]
        B2[Zone Risk Scorer\npincode flood and disruption risk]
        B3[Dynamic Premium Engine\nper-worker weekly recalculation]
        B4[Fraud Anomaly Detector\nrule-based multi-signal validation]
        B5[Compounding Risk Predictor\nforecast-based auto coverage upgrade]
    end

    subgraph outputs
        C1[Personalised weekly premium]
        C2[Time-weighted payout amount]
        C3[Auto approval or fraud flag]
        C4[Proactive coverage upgrade notification]
        C5[Formal credit report after 6 months]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B1
    A4 --> B4
    A5 --> B5

    B1 --> C2
    B2 --> C1
    B3 --> C1
    B4 --> C3
    B5 --> C4
    B4 --> C5

    style B1 fill:#0f3460,stroke:#533483,color:#fff
    style B4 fill:#0f3460,stroke:#e94560,color:#fff
```

**earning fingerprint** maps each worker's active hours by day and time. a disruption hitting their thursday evening peak triggers a higher payout than the same disruption at 3am. flat-rate payouts are not how real income loss works.

**zone risk scoring** operates at pincode level not city level. a worker in velachery and a worker in adyar are in the same city but face completely different flood exposure. the model knows the difference.

**repayment intelligence** monitors earnings passively each week. strong week means automatic deduction. weak week means the repayment pauses with no penalty. after six months of clean repayment the worker has a financial identity that did not exist before they joined locus.

---

## Adversarial Defense & Anti-Spoofing Strategy

### the threat

five hundred delivery workers coordinating via telegram, running GPS spoofing apps to fake their location inside an active flood alert zone, filing claims simultaneously, and draining the liquidity pool before the system detects anything unusual.

```mermaid
graph TD
    A[Fraud ring coordinates on Telegram] --> B[500 workers spoof GPS into flood zone]
    B --> C[Claims filed within 3-minute window]
    C --> D[Simple GPS check passes all 500]
    D --> E[Liquidity pool drained in minutes]

    A2[Locus defense pipeline] --> F[GPS coordinate logged]
    F --> G[Carrier tower location cross-checked]
    G --> H[Platform activity status verified]
    H --> I[Accelerometer pattern analyzed]
    I --> J[Claim velocity across zone monitored]
    J --> K{minimum 4 of 5 signals align}
    K -->|yes| L[claim approved]
    K -->|no| M[fraud flag triggered]
    J --> N[10 plus claims in under 3 minutes]
    N --> M

    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style L fill:#0f3460,stroke:#00b4d8,color:#fff
    style M fill:#1a1a2e,stroke:#e94560,color:#fff
```

### why a single GPS check fails

a spoofed GPS coordinate looks identical to a real one. there is no way to tell them apart if GPS is the only thing being checked. locus validates every claim across five independent signal dimensions simultaneously. compromising one or two is possible. compromising all five simultaneously without producing detectable statistical patterns is not.

### layer 1 — signal triangulation

```mermaid
graph LR
    subgraph genuine stranded worker
        R1[GPS inside flood zone]
        R2[Carrier tower matches GPS within 500m]
        R3[Platform showing active login attempts]
        R4[Accelerometer consistent with outdoor waiting]
        R5[Failed order attempts logged in last hour]
    end

    subgraph GPS spoofer at home
        F1[GPS inside flood zone — software faked]
        F2[Carrier tower pointing to home address]
        F3[Platform idle or fully offline]
        F4[Accelerometer showing horizontal rest]
        F5[No platform activity in last two hours]
    end

    R1 --> Pass[4 of 5 signals align — auto approved]
    R2 --> Pass
    R3 --> Pass
    R4 --> Pass
    R5 --> Pass

    F1 --> Fail[1 of 5 signals align — hard flag]
    F2 --> Fail
    F3 --> Fail
    F4 --> Fail
    F5 --> Fail

    style Pass fill:#0f3460,stroke:#00b4d8,color:#fff
    style Fail fill:#1a1a2e,stroke:#e94560,color:#fff
```

the most reliable signal is carrier tower triangulation. GPS can be overridden in software. the mobile network carrier tower that a device is physically connected to cannot be spoofed from a stationary home location. a gap of more than 500 meters between GPS coordinates and carrier tower location triggers an immediate fraud review regardless of other signals.

### layer 2 — coordinated ring detection

individual fraud gets caught by signal triangulation. coordinated ring fraud requires population-level detection.

```mermaid
timeline
    title claim velocity — genuine rain event vs coordinated fraud ring

    section genuine rain event
        6-00pm : 3 claims across zone
        6-15pm : 8 claims as rain intensifies
        6-30pm : 15 claims at peak rainfall
        6-45pm : 22 claims rain still active

    section coordinated fraud ring
        6-00pm : 0 claims filed
        6-02pm : 47 claims filed in under 120 seconds
        6-03pm : cluster anomaly triggers syndicate mode
        6-04pm : all 47 claims held pending full review
```

ten or more claims from the same zone within a three-minute window triggers automatic syndicate investigation. additional signals include historical baseline deviation where a worker suddenly claiming from a zone they have never worked in before gets flagged, device fingerprinting where multiple worker IDs originating from the same physical device get hard blocked, and social graph analysis where workers who consistently appear together across multiple separate claim events build a suspicion profile over time.

### layer 3 — ux balance

the goal is to stop fraud rings without creating a hostile experience for honest workers who may have imperfect signals during a genuine crisis.

```mermaid
flowchart TD
    A[Claim initiated] --> B{signal confidence score}

    B -->|above 85 percent| C[Tier 1 — auto approve\ninstant payout zero friction]

    B -->|50 to 85 percent| D[Tier 2 — soft flag\npayout held 2 hours\none passive check requested]

    D -->|worker responds| C
    D -->|no response after 2 hours| C
    Note1[a real worker in a crisis\nmay not be checking their phone.\nbenefit of the doubt is the default.] -.-> D

    B -->|below 50 percent| E[Tier 3 — hard flag\n24-hour manual review\nworker told exactly why]

    E -->|review clears| C
    E -->|review fails| F[claim rejected\nappeal window open]

    C --> G[audit log written\ncredit record updated]

    style C fill:#0f3460,stroke:#00b4d8,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
    style Note1 fill:#16213e,stroke:#533483,color:#aaa
```

any worker with six or more months of clean history gets automatic tier 1 status permanently. friction decreases the longer someone uses the platform honestly. that is intentional.

### the false positive problem — what happens tonight

this is the hardest part of the design. a genuine worker is stranded in a flood zone on a thursday evening. their GPS is jumping because the signal is degraded by heavy rain. their carrier tower shows them 600 meters from their GPS position because they are moving between zones trying to find a dry route. the system flags them tier 3.

they need money tonight. not in 24 hours.

locus handles this with an emergency partial release mechanism. when a tier 3 flag is triggered during an active severe weather event, the system automatically releases fifty percent of the calculated payout immediately as a non-repayable advance. the remaining fifty percent is held pending the 24-hour review. if the review clears, the remainder lands. if the review fails, locus absorbs the advance as a cost of operating fairly. a real fraud ring targeting fifty percent payouts is not economically viable — the math stops working for them at half payout.

this means an honest worker never goes home empty-handed because an algorithm had incomplete signal. and a fraud ring gains nothing from triggering a flag intentionally to access partial payouts.

```mermaid
flowchart TD
    A[Tier 3 hard flag triggered] --> B{Is there an active severe\nweather event in this zone?}

    B -->|yes| C[Release 50 percent of payout immediately\nnon-repayable emergency advance]
    B -->|no| D[Full hold pending 24-hour review]

    C --> E[Remaining 50 percent held for review]
    D --> E

    E --> F{Review outcome}
    F -->|cleared| G[Remaining amount released\nflag removed from record]
    F -->|confirmed fraud| H[Advance absorbed by Locus\nworker account suspended\npending investigation]

    G --> I[Worker record stays clean]
    H --> J[Fraud case escalated]

    style C fill:#0f3460,stroke:#00b4d8,color:#fff
    style G fill:#0f3460,stroke:#00b4d8,color:#fff
    style H fill:#1a1a2e,stroke:#e94560,color:#fff
```

the system is designed around one principle: it is more expensive to wrongly deny a genuine claim than to absorb the occasional partial fraud loss. a stranded worker who gets nothing tonight does not come back. a fraud ring getting fifty percent of a flagged claim stops being profitable.

---

## technical architecture

```mermaid
graph TD
    subgraph client
        MW[Worker PWA\nNext.js mobile-first\nPWA installable]
        AD[Admin Dashboard\nNext.js desktop\nfull analytics]
    end

    subgraph api
        BA[Backend API\nNode.js Express]
    end

    subgraph engines
        PE[Premium Engine\nPython scikit-learn]
        CP[Claims Pipeline\nparametric trigger monitor]
        FD[Fraud Detector\nmulti-signal validator]
        RE[Repayment Engine\nweekly deduction logic]
    end

    subgraph data
        CV[Convex\nrealtime serverless database]
        CR[Convex Cron Jobs\nhourly trigger polling]
    end

    subgraph integrations
        OW[OpenWeatherMap\nfree tier live weather]
        RP[Razorpay Test Mode\nmock UPI payouts]
        TM[Telecom API\ncarrier tower verification]
    end

    MW <--> BA
    AD <--> BA
    BA <--> PE
    BA <--> CP
    BA <--> FD
    BA <--> RE
    BA <--> CV
    CR --> CP
    CP --> OW
    CP --> RP
    FD --> TM

    style MW fill:#0f3460,stroke:#533483,color:#fff
    style AD fill:#0f3460,stroke:#533483,color:#fff
    style CV fill:#1a1a2e,stroke:#00b4d8,color:#fff
    style FD fill:#1a1a2e,stroke:#e94560,color:#fff
```

---

## stack

```mermaid
graph TD
    subgraph client [Client Layer]
        W[Worker PWA\nNext.js mobile-first]
        A[Admin Dashboard\nNext.js desktop]
    end

    subgraph backend [Backend Layer]
        API[Node.js API]
        CP[Silent Claims Pipeline]
        RE[Repayment Engine]
    end

    subgraph ai_ml [AI and ML Layer — Python + scikit-learn]
        direction LR
        subgraph inputs [Data Inputs]
            D1[Platform activity logs]
            D2[Historical weather\nper pincode]
            D3[Worker schedule\npatterns]
            D4[Claim and repayment\nhistory]
            D5[Strike and event\ncalendar]
        end

        subgraph models [Models]
            EF[Earning Fingerprint\nPredicts income loss\nby hour and day]
            ZR[Zone Risk Scorer\nPincode flood risk\n2yr historical data]
            PE[Dynamic Premium\nWeekly recalculation\nper worker]
            FD[Fraud Detector\nMulti-signal classifier\n5 independent signals]
            CR[Compounding Risk\nForecast-based\nauto coverage upgrade]
        end

        subgraph outputs [Outputs]
            O1[Personalised\nweekly premium]
            O2[Time-weighted\npayout amount]
            O3[Auto approve\nor fraud flag]
            O4[Coverage upgrade\nnotification]
            O5[Credit report\nafter 6 months]
        end

        D1 --> EF
        D2 --> ZR
        D3 --> EF
        D4 --> FD
        D5 --> CR
        EF --> O2
        ZR --> O1
        PE --> O1
        FD --> O3
        CR --> O4
        FD --> O5
    end

    subgraph data [Data Layer]
        CV[Convex Database\nrealtime + serverless\nACID transactions]
        CJ[Convex Cron Jobs\nhourly trigger polling]
    end

    subgraph integrations [External Integrations]
        OW[OpenWeatherMap\nfree tier\nlive disruption data]
        RP[Razorpay Test Mode\nmock UPI payouts]
        TM[Carrier Tower API\nanti-spoofing signal]
    end

    subgraph hosting [Hosting]
        VL[Vercel free tier\nauto deploy from GitHub]
    end

    W <--> API
    A <--> API
    API <--> ai_ml
    API <--> CP
    API <--> RE
    API <--> CV
    CJ --> CP
    CP --> OW
    CP --> RP
    FD --> TM
    W --> VL
    A --> VL

    style W fill:#0f3460,stroke:#533483,color:#fff
    style A fill:#0f3460,stroke:#533483,color:#fff
    style API fill:#0f3460,stroke:#00b4d8,color:#fff
    style CP fill:#0f3460,stroke:#00b4d8,color:#fff
    style RE fill:#0f3460,stroke:#00b4d8,color:#fff
    style EF fill:#16213e,stroke:#533483,color:#fff
    style ZR fill:#16213e,stroke:#533483,color:#fff
    style PE fill:#16213e,stroke:#533483,color:#fff
    style FD fill:#16213e,stroke:#e94560,color:#fff
    style CR fill:#16213e,stroke:#533483,color:#fff
    style CV fill:#1a1a2e,stroke:#00b4d8,color:#fff
    style CJ fill:#1a1a2e,stroke:#00b4d8,color:#fff
    style VL fill:#1a1a2e,stroke:#00b4d8,color:#fff
    style OW fill:#1a1a2e,stroke:#533483,color:#fff
    style RP fill:#1a1a2e,stroke:#533483,color:#fff
    style TM fill:#1a1a2e,stroke:#e94560,color:#fff
```

| layer | technology | reason |
|---|---|---|
| frontend | next.js + tailwind | one codebase, mobile worker PWA and desktop admin dashboard |
| ai and ml | python + scikit-learn | earning fingerprint, zone risk scoring, premium engine, fraud detection |
| backend | node.js | api layer, claims pipeline, repayment engine |
| database | convex | realtime, serverless, ACID, cron jobs built in — no separate server |
| weather | openweathermap free tier | live disruption trigger monitoring |
| payments | razorpay test mode | mock UPI payouts |
| hosting | vercel free tier | zero cost, auto deploys from github |

total infrastructure cost: zero.

---

## development roadmap

```mermaid
gantt
    title Locus — 6 week build plan
    dateFormat  YYYY-MM-DD

    section phase 1 foundation
    repo structure and schema design         :done, 2026-03-04, 2026-03-20
    idea documentation and readme            :done, 2026-03-04, 2026-03-20
    adversarial defense architecture         :done, 2026-03-19, 2026-03-20
    minimal prototype both views             :done, 2026-03-19, 2026-03-20

    section phase 2 core build
    worker onboarding and registration       :2026-03-21, 2026-03-28
    dynamic premium calculation engine       :2026-03-21, 2026-03-28
    parametric trigger integrations          :2026-03-25, 2026-04-04
    silent claims pipeline                   :2026-03-28, 2026-04-04

    section phase 3 scale
    advanced fraud detection GPS spoofing    :2026-04-05, 2026-04-12
    mock UPI payout integration              :2026-04-05, 2026-04-10
    worker and admin dashboards complete     :2026-04-08, 2026-04-17
    final five minute demo video             :2026-04-15, 2026-04-17
```

---

## team

| member | focus | what they own |
|---|---|---|
| member a | backend | api layer, database schema, parametric trigger engine, end-to-end pipeline integration |
| member b | ai and ml | earning fingerprint model, zone risk scorer, dynamic premium engine, fraud anomaly detection |
| member c | frontend | worker-facing PWA — registration, policy view, payout notification screens |
| member d | systems and ops | admin dashboard, mock API responses, testing, pitch deck, submission logistics |

---

## why the numbers work

```mermaid
graph LR
    subgraph for the worker
        W1[weekly premium paid: ₹60]
        W2[bad week income lost: ₹1,200]
        W3[effective return: 20x on a bad week]
        W1 --> W3
        W2 --> W3
    end

    subgraph for the insurer
        I1[credit repayments self-replenish the pool]
        I2[moderate events do not trigger full payouts]
        I3[loss ratios become manageable and predictable]
        I1 --> I3
        I2 --> I3
    end

    subgraph for the system
        E1[15 lakh workers enter formal credit system]
        E2[repayment history creates financial identity]
        E3[unbanked workers become bankable over time]
        E1 --> E3
        E2 --> E3
    end

    style W3 fill:#0f3460,stroke:#00b4d8,color:#fff
    style I3 fill:#0f3460,stroke:#533483,color:#fff
    style E3 fill:#0f3460,stroke:#e94560,color:#fff
```

pure parametric insurance at this scale breaks down during monsoon season because everyone claims at once. the credit layer solves this. repayments create a float that stabilises the pool. the insurer's loss ratio stays predictable. the worker gets protected. the credit facility is not just a product feature — it is what makes the business model viable.

the safety net exists. it just has not been built yet.

---

*locus — guidewire devtrails 2026*
