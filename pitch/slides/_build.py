#!/usr/bin/env python3
"""Generates 01.html … 10.html (1920×1080) for the Allowance pitch deck.

Edit the slide bodies below and re-run `python3 _build.py`, then `./render.sh`.
(Editing the HTML files directly also works, but re-running this overwrites them.)
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOTAL = 10

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0B1020}
body{font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:1920px;height:1080px;padding:84px 128px 72px;display:flex;flex-direction:column;
  background:radial-gradient(1000px 700px at 92% 0%,rgba(153,69,255,.22),transparent 70%),
             radial-gradient(1000px 700px at 0% 100%,rgba(20,241,149,.11),transparent 70%),#0B1020}
.top{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:rgba(255,255,255,.5);letter-spacing:.02em}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;color:#fff;font-size:26px;letter-spacing:-.01em}
.dot{width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#9945FF,#14F195)}
main{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;padding:32px 0 20px}
.bot{display:flex;justify-content:space-between;font-size:20px;color:rgba(255,255,255,.38)}
.kicker{font-size:26px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:26px}
.grad,.kicker{background:linear-gradient(90deg,#9945FF,#14F195);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.08em}
h1{font-size:120px;line-height:1.02;font-weight:800;letter-spacing:-.035em}
h2{font-size:84px;line-height:1.06;font-weight:800;letter-spacing:-.03em}
h3{font-size:40px;line-height:1.15;font-weight:700;letter-spacing:-.015em}
.lead{font-size:40px;line-height:1.4;color:rgba(255,255,255,.75)}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.11);border-radius:28px;padding:44px}
.card p{font-size:30px;line-height:1.42;color:rgba(255,255,255,.72);margin-top:16px}
.muted{color:rgba(255,255,255,.6)}
.foot{font-size:17px;color:rgba(255,255,255,.45);line-height:1.55}
.row{display:flex;gap:36px}
.row>*{flex:1}
.num{display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;
  background:linear-gradient(135deg,#9945FF,#14F195);color:#0B1020;font-weight:800;font-size:28px;flex:none}
.chip{display:inline-flex;align-items:center;gap:12px;padding:16px 28px;border-radius:999px;font-size:26px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);color:rgba(255,255,255,.85)}
.chip::before{content:"";width:12px;height:12px;border-radius:50%;background:#14F195}
.gborder{border:2px solid transparent;background:linear-gradient(#141A33,#141A33) padding-box,linear-gradient(135deg,#9945FF,#14F195) border-box}
"""

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1920, height=1080">
<title>Allowance — slide __N__</title>
<style>__CSS__
__EXTRA__</style>
</head>
<body>
<div class="slide">
__TOP__
<main>
__BODY__
</main>
<footer class="bot"><span>Allowance · A company card for AI employees</span><span>__N__ / __TOTAL__</span></footer>
</div>
</body>
</html>
"""

TOP = """<header class="top"><div class="brand"><span class="dot"></span>Allowance</div><div>__LABEL__</div></header>"""

slides = []

# 01 — Title
slides.append(dict(top=False, extra="""
.title-wrap{display:flex;flex-direction:column;align-items:flex-start}
.logo{height:120px;margin-bottom:44px}
.big{font-size:220px;line-height:.95;font-weight:800;letter-spacing:-.05em}
.sub{font-size:68px;font-weight:700;letter-spacing:-.025em;margin-top:34px}
.byline{margin-top:60px;font-size:30px;color:rgba(255,255,255,.6)}
.byline b{color:#fff;font-weight:600}
""", body="""
<div class="title-wrap">
  <img class="logo" src="../../brand/logo.svg" alt="Allowance logo" onerror="this.style.display='none'">
  <div class="kicker">Solana · Colosseum Crypto World's Fair</div>
  <div class="big">Allowance</div>
  <div class="sub">A company card for <span class="grad">AI employees</span>.</div>
  <div class="lead" style="margin-top:28px">Spending limits for AI agents, enforced on-chain.</div>
  <div class="byline"><b>Anthony Beaumont</b> · Encode Club × Saint · London</div>
</div>
"""))

# 02 — Problem
slides.append(dict(label="The problem", extra="""
.cards{margin-top:72px}
.card h3{display:flex;gap:20px;align-items:center;font-size:35px;white-space:nowrap}
""", body="""
<div class="kicker">The problem</div>
<h2>Agents can do the work.<br>They can't <span class="grad">pay</span> for it.</h2>
<div class="row cards">
  <div class="card"><h3><span class="num">1</span>Checkouts block bots</h3>
    <p>Secure card iframes, CVC fields, 3-D Secure and bot checks stop automated entry.</p></div>
  <div class="card"><h3><span class="num">2</span>Unlimited risk</h3>
    <p>Hand an agent a card number or a hot wallet and its limit is your whole balance.</p></div>
  <div class="card"><h3><span class="num">3</span>A human steps in</h3>
    <p>The automation stops at the very last step, and someone has to finish it by hand.</p></div>
</div>
"""))

# 03 — Insight / founder story
slides.append(dict(label="Why us", extra="""
.split{display:grid;grid-template-columns:1.25fr 1fr;gap:72px;margin-top:64px;align-items:start}
.story{font-size:38px;line-height:1.45;color:rgba(255,255,255,.8);border-left:6px solid;border-image:linear-gradient(#9945FF,#14F195) 1;padding-left:40px}
.story b{color:#fff}
.fit{display:flex;flex-direction:column;gap:28px}
.fit .card{padding:36px 40px}
.fit h3{font-size:36px}
.fit p{font-size:27px;margin-top:10px}
""", body="""
<div class="kicker">The insight</div>
<h2>The work is done.<br><span class="grad">Except the payment.</span></h2>
<div class="split">
  <div class="story">This month, <b>Saint's AI employees</b> regularly got all the way to checkout on real purchases, then stopped at secure card fields, CVC boxes and 3-D Secure.<br><br><b>A human had to step in</b> to finish the job.</div>
  <div class="fit">
    <div class="card"><h3>Saint</h3><p>AI employees for small businesses. We hit this problem ourselves.</p></div>
    <div class="card"><h3>Encode Club</h3><p>Developer education and hackathon community in London. We know the people building agents.</p></div>
  </div>
</div>
"""))

# 04 — How it works
ARROW = """<svg width="170" height="30" viewBox="0 0 170 30"><defs><linearGradient id="g__ID__" gradientUnits="userSpaceOnUse" x1="4" y1="15" x2="150" y2="15"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs><line x1="4" y1="15" x2="150" y2="15" stroke="url(#g__ID__)" stroke-width="5" stroke-linecap="round"/><path d="M146 4 L166 15 L146 26 Z" fill="#14F195"/></svg>"""
slides.append(dict(label="How it works", extra="""
h2.small{font-size:56px}
.kicker{margin-bottom:18px}
.diagram{display:grid;grid-template-columns:1fr 230px 1fr 230px 1fr;grid-template-rows:auto 70px auto;align-items:center;margin-top:44px}
.node{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.13);border-radius:28px;padding:28px 34px;min-height:200px}
.node h3{font-size:38px}
.node p{font-size:23px;line-height:1.42;color:rgba(255,255,255,.68);margin-top:12px}
.node .tag{display:inline-block;margin-top:16px;font-size:22px;font-weight:700;color:#0B1020;background:linear-gradient(90deg,#9945FF,#14F195);padding:6px 16px;border-radius:999px}
.node.key{background:linear-gradient(#141A33,#141A33) padding-box,linear-gradient(135deg,#9945FF,#14F195) border-box;border:3px solid transparent}
.arrow{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:20px;color:rgba(255,255,255,.55);font-family:"Liberation Mono",Menlo,monospace}
.down{grid-column:3;grid-row:2;display:flex;align-items:center;justify-content:center;gap:18px;height:100%;font-size:22px;color:rgba(255,255,255,.6)}
.down .line{width:0;height:100%;border-left:4px dashed rgba(255,255,255,.35)}
.human{grid-column:3;grid-row:3;min-height:0;border-style:dashed}
.chips{display:flex;gap:18px;flex-wrap:wrap;margin-top:36px}
.chips .chip{font-size:23px;padding:13px 22px}
""", body="""
<div class="kicker">How it works</div>
<h2 class="small">Each agent gets its own card. <span class="grad">The chain enforces the limit.</span></h2>
<div class="diagram">
  <div class="node"><h3>Business treasury</h3><p>USDC on Solana. The business keeps custody.</p></div>
  <div class="arrow"><span>approve(cap)</span>__A1__</div>
  <div class="node key"><h3>Agent card</h3><p>Business-owned USDC account. The agent is only an SPL Token delegate.</p><span class="tag">on-chain cap: $50</span></div>
  <div class="arrow"><span>pay + memo</span>__A2__</div>
  <div class="node"><h3>Merchant / x402 API</h3><p>HTTP 402 → pay in USDC → retry with proof → resource.</p></div>
  <div class="down"><div class="line"></div><span>over budget</span></div>
  <div class="node human"><h3>Human approval</h3><p>One-tap request to the owner.</p></div>
</div>
<div class="chips">
  <span class="chip">Overspend → rejected on-chain</span>
  <span class="chip">Revoke instantly</span>
  <span class="chip">Memo receipts + CSV ledger</span>
  <span class="chip">Fees sponsored: no SOL needed</span>
</div>
""".replace("__A1__", ARROW.replace("__ID__", "1")).replace("__A2__", ARROW.replace("__ID__", "2"))))

# 05 — Demo screenshot
slides.append(dict(label="Live demo · Solana devnet", extra="""
.slide{padding-bottom:56px}
.demo-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:28px}
.demo-head h2{font-size:56px}
.demo-head .url{font-size:28px;color:rgba(255,255,255,.65)}
.frame{position:relative;flex:1;min-height:0;border-radius:32px;overflow:hidden;
  border:3px solid transparent;background:linear-gradient(#111733,#111733) padding-box,linear-gradient(135deg,#9945FF,#14F195) border-box;
  box-shadow:0 40px 120px rgba(0,0,0,.55)}
.frame .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:rgba(255,255,255,.4);font-size:32px}
.frame .ph code{font-size:24px;font-family:"Liberation Mono",Menlo,monospace}
.frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center}
main{justify-content:flex-start;padding-top:36px}
""", body="""
<div class="demo-head"><h2>The <span class="grad">dashboard</span></h2><span class="url">allowance.olivia.saint.work · devnet, no real money</span></div>
<div class="frame">
  <div class="ph"><span>Dashboard screenshot</span><code>projects/allowance/shots/dashboard.png</code></div>
  <img src="../../shots/dashboard.png" alt="Allowance dashboard" onerror="this.style.display='none'">
</div>
"""))

# 06 — Why Solana
slides.append(dict(label="Why Solana", extra="""
h2{font-size:72px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:44px}
.tile{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.11);border-radius:28px;padding:30px 38px;min-height:190px}
.tile .v{font-size:58px;font-weight:800;letter-spacing:-.03em}
.tile p{font-size:26px;line-height:1.38;color:rgba(255,255,255,.7);margin-top:8px}
.foot{margin-top:26px}
""", body="""
<div class="kicker">Why Solana</div>
<h2>Fast, cheap, USDC-native.<br>And the limit is <span class="grad">a token standard</span>.</h2>
<div class="grid">
  <div class="tile"><div class="v grad">~400ms</div><p>finality¹: agents pay and carry on</p></div>
  <div class="tile"><div class="v grad">$0.00025</div><p>per transaction¹: pay-per-request works</p></div>
  <div class="tile"><div class="v grad">$11B+</div><p>stablecoins in circulation on Solana¹</p></div>
  <div class="tile"><div class="v">SPL delegate</div><p>approve / revoke allowances are built into the audited SPL Token program</p></div>
  <div class="tile"><div class="v">x402</div><p>HTTP 402 payments already live on Solana: 35M+ transactions since launch¹</p></div>
  <div class="tile"><div class="v">0 SOL</div><p>fees sponsored, so agents never need to hold SOL</p></div>
</div>
<div class="foot">¹ Solana Foundation, "What is x402?", solana.com/x402/what-is-x402 (accessed 12 Oct 2026).</div>
"""))

# 07 — Market
slides.append(dict(label="Market", extra="""
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:70px}
.stat{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.11);border-radius:28px;padding:48px 44px}
.stat .v{font-size:118px;font-weight:800;letter-spacing:-.045em;line-height:1}
.stat p{font-size:30px;line-height:1.4;color:rgba(255,255,255,.75);margin-top:22px}
.stat sup{font-size:.6em;color:rgba(255,255,255,.5)}
.notes{margin-top:52px;font-size:16px}
""", body="""
<div class="kicker">Market</div>
<h2>Every agent will need <span class="grad">a budget</span>.</h2>
<div class="stats">
  <div class="stat"><div class="v grad">$3–5T</div><p>global agentic commerce orchestrated by AI agents by 2030<sup>1</sup></p></div>
  <div class="stat"><div class="v grad">$52.6B</div><p>AI agents market by 2030, growing 46.3% a year<sup>2</sup></p></div>
  <div class="stat"><div class="v grad">$390B</div><p>real stablecoin payments a year, more than doubled since 2024<sup>3</sup></p></div>
</div>
<div class="foot notes">
  1 McKinsey, "The agentic commerce opportunity", 17 Oct 2025 · mckinsey.com/capabilities/quantumblack/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants<br>
  2 MarketsandMarkets, "AI Agents Market – Global Forecast to 2030" (CAGR 2025–2030) · marketsandmarkets.com/Market-Reports/ai-agents-market-15761548.html<br>
  3 McKinsey with Artemis Analytics, "Stablecoins in payments: What the raw transaction numbers miss", 18 Feb 2026 (annualised from Dec 2025) · mckinsey.com/industries/financial-services/our-insights/stablecoins-in-payments-what-the-raw-transaction-numbers-miss
</div>
"""))

# 08 — Business model + GTM
slides.append(dict(label="Business model & go-to-market", extra="""
.cols{display:grid;grid-template-columns:1fr 1.15fr;gap:40px;margin-top:44px}
.cols .card{padding:36px 44px}
h2{font-size:76px}
.cols h3{font-size:34px;color:rgba(255,255,255,.6);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:24px}
.plan{margin-top:20px;padding:20px 0 4px;border-top:1px solid rgba(255,255,255,.1)}
.plan .name{font-size:40px;font-weight:800}
.plan .price{font-size:30px;color:rgba(255,255,255,.8);margin-top:6px}
.why{font-size:22px;line-height:1.45;color:rgba(255,255,255,.55);margin-top:10px}
.steps{list-style:none;margin-top:22px;display:flex;flex-direction:column;gap:24px}
.steps li{display:flex;gap:24px;align-items:flex-start;font-size:29px;line-height:1.35;color:rgba(255,255,255,.85)}
.steps li small{display:block;font-size:22px;color:rgba(255,255,255,.5);margin-top:4px}
.steps .num{width:50px;height:50px;font-size:24px;border-radius:14px}
""", body="""
<div class="kicker">Business model &amp; go-to-market</div>
<h2>Priced like a seat. <span class="grad">Grows with spend.</span></h2>
<div class="cols">
  <div class="card">
    <h3>Pricing (planned)</h3>
    <div class="plan"><div class="name">Free</div><div class="price">1 agent, up to $250 a month of agent spend</div><div class="why">For builders and hackathon teams.</div></div>
    <div class="plan"><div class="name grad">Business</div><div class="price">$10 per agent / month + 0.5% of agent spend</div><div class="why">Per-seat matches how small businesses buy AI employees; the spend share grows with value. To be tested with design partners.</div></div>
  </div>
  <div class="card">
    <h3>Go-to-market</h3>
    <ul class="steps">
      <li><span class="num">1</span><div>Saint's own AI employees<small>First user: internal, not external traction</small></div></li>
      <li><span class="num">2</span><div>Encode Club developers &amp; hackathons<small>Reach the people building agents</small></div></li>
      <li><span class="num">3</span><div>SDK + MCP server for agent frameworks<small>A budget any agent can plug into</small></div></li>
      <li><span class="num">4</span><div>x402 merchants &amp; APIs<small>Where agents already pay in USDC</small></div></li>
    </ul>
  </div>
</div>
"""))

# 09 — Team
slides.append(dict(label="Team", extra="""
.people{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:36px;margin-top:70px}
.person{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.11);border-radius:28px;padding:48px 44px}
.person.todo{border:2px dashed rgba(255,255,255,.22);background:transparent}
.av{width:120px;height:120px;border-radius:36px;display:flex;align-items:center;justify-content:center;font-size:46px;font-weight:800;color:#0B1020;background:linear-gradient(135deg,#9945FF,#14F195)}
.todo .av{background:rgba(255,255,255,.08);color:rgba(255,255,255,.4)}
.person h3{margin-top:34px;font-size:44px}
.person .role{font-size:28px;color:rgba(255,255,255,.75);margin-top:10px;line-height:1.4}
.person .more{font-size:25px;color:rgba(255,255,255,.55);margin-top:18px;line-height:1.45}
""", body="""
<div class="kicker">Team</div>
<h2>Building for agents we <span class="grad">already run</span>.</h2>
<div class="people">
  <div class="person"><div class="av">AB</div><h3>Anthony Beaumont</h3>
    <div class="role">Co-founder &amp; CEO, Encode Club</div>
    <div class="more">Building Saint: AI employees for small businesses. London.</div></div>
  <div class="person todo"><div class="av">?</div><h3>TODO: name</h3><div class="role">TODO: role</div><div class="more">TODO: one line</div></div>
  <div class="person todo"><div class="av">?</div><h3>TODO: name</h3><div class="role">TODO: role</div><div class="more">TODO: one line</div></div>
</div>
"""))

# 10 — Ask / closing
slides.append(dict(label="The ask", extra="""
h1{font-size:104px}
.asks{display:flex;gap:22px;flex-wrap:wrap;margin-top:44px}
.asks .chip{font-size:29px;padding:17px 30px}
.links{display:flex;gap:72px;margin-top:56px}
.link{display:flex;flex-direction:column;gap:10px}
.link .l{font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5);font-weight:700}
.link .u{font-size:44px;font-weight:700;letter-spacing:-.01em}
.stage{margin-top:44px;font-size:25px;color:rgba(255,255,255,.5)}
""", body="""
<div class="kicker">The ask</div>
<h1>Give your agents<br>an <span class="grad">Allowance</span>.</h1>
<div class="asks">
  <span class="chip">A place in the Colosseum accelerator</span>
  <span class="chip">Honest feedback</span>
  <span class="chip">Design partners: businesses running AI agents</span>
</div>
<div class="links">
  <div class="link"><span class="l">Live demo</span><span class="u grad">allowance.olivia.saint.work</span></div>
  <div class="link"><span class="l">Code</span><span class="u">github.com/olivia-saint/allowance</span></div>
</div>
<div class="stage">Hackathon MVP on Solana devnet · built 12 Oct 2026 · no real money</div>
"""))

assert len(slides) == TOTAL
for i, s in enumerate(slides, 1):
    n = f"{i:02d}"
    top = "" if s.get("top") is False else TOP.replace("__LABEL__", s.get("label", ""))
    html = (PAGE.replace("__CSS__", CSS).replace("__EXTRA__", s.get("extra", ""))
                .replace("__TOP__", top).replace("__BODY__", s["body"].strip())
                .replace("__TOTAL__", str(TOTAL)).replace("__N__", str(i)))
    (HERE / f"{n}.html").write_text(html)
    print("wrote", f"{n}.html")
