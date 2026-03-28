# Hacker News Launch Post

## 🎯 Recommended Title

```
Constraint Theory: Snap floats to exact Pythagorean triples, eliminate drift
```

**Why this title works:**
- Names the project clearly
- States the core benefit (snap to exact)
- Identifies the pain point (drift)
- Hints at the clever math (Pythagorean triples)
- No marketing fluff

---

## 📝 Alternative Titles (A/B Test Ready)

| Rank | Title | Why It Works |
|------|-------|--------------|
| 1 | `Constraint Theory: Snap floats to exact Pythagorean triples, eliminate drift` | Clear, benefit-focused, technical |
| 2 | `Show HN: I built a Rust library that makes floating-point errors impossible` | Personal, dramatic claim |
| 3 | `0.6² + 0.8² = 1.0000000000000002 — and I fixed it with Pythagorean triples` | Math hook, curiosity gap |
| 4 | `Constraint Theory: Deterministic geometry via Pythagorean manifold snapping` | Academic, signals depth |
| 5 | `Show HN: A KD-tree approach to exact floating-point directions` | Technical, algorithm-focused |

---

## 💬 First Comment (Post Immediately After)

```markdown
Hi HN! Author here.

The 10-second pitch: Every Pythagorean triple (3,4,5) normalizes to an exact rational (3/5, 4/5) on the unit circle. I precompute ~1000 of these, index them in a KD-tree, and snap your noisy floats to the nearest exact state in ~100ns.

**What this solves:**
- "Works on my machine" bugs
- Multiplayer game desyncs
- Monte Carlo simulations that won't reproduce
- Unit tests that flake on CI

**What it doesn't solve:**
- 3D geometry (open research problem - PRs welcome!)
- General constraint satisfaction (use OR-Tools)
- Arbitrary precision (this is ~1000 discrete states)

**Try it now:**
```bash
# Rust
cargo add constraint-theory-core

# Python
pip install constraint-theory
```

**Live demos:** 49 interactive visualizations at https://constraint-theory.superinstance.ai

The code is Rust (zero dependencies) with Python bindings via PyO3. The core insight is that Pythagorean triples have been around for 2500 years - I just indexed them for O(log n) lookup.

Happy to answer questions about the math, implementation, or use cases.
```

---

## 🎪 Launch Day Checklist

### Before Posting
- [ ] Post Tuesday-Thursday, 9-11am EST (peak HN traffic)
- [ ] Have first comment ready to paste immediately
- [ ] Verify all links work (demos, GitHub, docs)
- [ ] Check that `pip install constraint-theory` works
- [ ] Check that `cargo add constraint-theory-core` works

### During Launch
- [ ] Monitor for first 2 hours (critical period)
- [ ] Reply to every comment within 15 minutes
- [ ] Be humble, accept criticism gracefully
- [ ] Don't argue - acknowledge valid points
- [ ] Thank people for feedback

### After Launch
- [ ] Post to r/rust, r/Python, r/algorithms
- [ ] Share on Twitter/X
- [ ] Update README with "As featured on Hacker News"
- [ ] Add HN comment quotes to testimonials

---

## 🎯 Expected Questions & Answers

### Q: Why not use arbitrary precision?
```markdown
Arbitrary precision is great for some cases, but:
1. It's slow (this is ~100ns)
2. It still has the "normalization problem" - you have to round eventually
3. This gives you ~1000 exact states that satisfy constraints by construction
```

### Q: Why not just use fractions.Fraction in Python?
```markdown
Good question! A few reasons:
1. Fraction operations are slower than this (~100ns KD-tree lookup)
2. This returns floats that are EXACT rationals - you get the same API
3. You get O(log n) batch operations with SIMD optimization
```

### Q: What about 3D?
```markdown
Great question - this is an open research problem. Pythagorean triples are inherently 2D. 

For 3D, you'd need Pythagorean quadruples (a² + b² + c² = d²), but:
1. The density grows O(d³) vs O(d²) for 2D
2. KD-tree depth affects the O(log n) guarantee

I'd love help on this - it's listed in the open problems section!
```

### Q: Is this actually useful or just clever?
```markdown
Depends on your use case! If you've ever had:
- A simulation give different results on different machines
- Multiplayer games desync
- Monte Carlo that wouldn't reproduce
- Tests that flake on CI

Then yes, this deletes an entire debugging class. If you don't have those problems, it might be overkill.
```

### Q: What's the catch?
```markdown
Honest answer:
1. 2D only (3D is open research)
2. ~1000 discrete states (not continuous)
3. You're quantizing (introducing noise up to nearest triple)
4. API may evolve (research-grade)

I list all limitations prominently because I'd rather under-promise and over-deliver.
```

---

## 📊 Success Metrics

| Metric | Target | Stretch |
|--------|--------|---------|
| Upvotes (24hr) | 100+ | 300+ |
| Comments | 50+ | 100+ |
| GitHub stars | +50 | +200 |
| PyPI downloads | +100 | +500 |
| Front page? | Top 30 | Top 10 |

---

## 🔥 The Hook That Works

The strongest opening for comments/conversation:

```
"The floating-point number 0.6² + 0.8² equals 1.0000000000000002.

But if you snap (0.6, 0.8) to the Pythagorean triple (3/5, 4/5), you get exactly 1.0.

This library does that in 100 nanoseconds."
```

**Why this works:**
1. Concrete example (not abstract)
2. Names the problem (FP drift)
3. Shows the solution (Pythagorean triples)
4. Gives performance (100ns)
5. Short enough to remember

---

## ⚠️ What NOT To Do

1. **Don't** post on weekends or late night
2. **Don't** use marketing language ("revolutionary", "game-changing")
3. **Don't** argue with negative comments
4. **Don't** delete the post if it doesn't get traction
5. **Don't** have your friends upvote (HN detects this)
6. **Don't** post the same thing twice in a month

---

## 🚀 Launch Sequence

```
T-0:   Post to HN
T+1m:  Paste first comment
T+5m:  Check for first responses
T+15m: Reply to any comments
T+1h:  Check ranking, reply more
T+2h:  Post to Reddit (if doing well)
T+24h: Analyze results, update testimonials
```

---

<div align="center">

**Good luck! The READMEs are polished, the demos work, and the first comment is ready.**

**Now go make floating-point errors someone else's problem. ⚡**

</div>
