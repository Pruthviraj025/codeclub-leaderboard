# CodeClub Leaderboard

A leaderboard site built for CodeClub, KLE Tech's competitive programming club.

The idea started with a simple problem: summer vacation kills momentum. People stop solving problems, ratings stagnate, and by the time the semester starts again half the club has gone quiet. This site exists to fix that  it pulls everyone's Codeforces and LeetCode stats automatically and puts them side by side on a ranked leaderboard, so members can see where they stand against each other and (hopefully) feel a little competitive pressure to keep grinding.

Rankings aren't based on raw rating or a plain problem count. Points come from problems solved, weighted by how hard each problem is. A CF problem rated 3000 is worth 4600 points; an unrated one is worth 100. LC problems score dynamically based on difficulty, acceptance rate, and submission volume. Grinding easy problems for volume doesn't get you far up the board.

Stats are also tracked on a moving 7 day window, so the board reflects who's actually been active recently rather than who solved a pile of problems months ago and then went quiet.

## Who it's for

Current and incoming members of CodeClub. Anyone with a Codeforces and/or LeetCode handle can register, link their profiles, and show up on the board.

## What you can do on it

- See a live ranking of club members, weighted by problem difficulty rather than raw counts
- Refresh your own stats on demand (CF and LC refresh independently, each with a cooldown)
- Track recent activity via the rolling 7-day window instead of a single all-time snapshot

## Scoring

**Codeforces**  points scale with problem rating:

| Rating | Points | Rating | Points | Rating | Points |
|---|---|---|---|---|---|
| unrated | 100 | 1600 | 1800 | 2500 | 3500 |
| 800 | 200 | 1700 | 1900 | 2600 | 3800 |
| 900 | 300 | 1800 | 2200 | 2700 | 3900 |
| 1000 | 600 | 1900 | 2300 | 2800 | 4200 |
| 1100 | 700 | 2000 | 2600 | 2900 | 4300 |
| 1200 | 1000 | 2100 | 2700 | 3000 | 4600 |
| 1300 | 1100 | 2200 | 3000 | 3100 | 4700 |
| 1400 | 1400 | 2300 | 3100 | 3200 | 5000 |
| 1500 | 1500 | 2400 | 3400 | 3300 | 5100 |
| | | | | 3400 | 5400 |
| | | | | 3500 | 5500 |

**LeetCode**  points depend on difficulty, acceptance rate, and total submissions:

| Difficulty | Points range |
|---|---|
| Easy | 200–400 |
| Medium | 700–1200 |
| Hard | 1500–2500 |

`Final Score = Base Score × Acceptance Factor × Submission Factor`, rounded to the nearest 100 and clamped to the range above. Rarer, less-solved problems score higher within their band.

## Site

https://codeclub-leaderboard.vercel.app

Built and maintained as an ongoing project for the club  not a one-off assignment. Stats refresh periodically on their own, and features get added as members ask for them.
