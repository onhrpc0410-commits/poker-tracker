# Poker Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 賭けポーカーの収支とポットを、iPad横向きで正確に記録・集計する静的Webアプリを作る。

**Architecture:** ゲームのルール計算は DOM に触れない純粋関数の `Engine` に集約し、状態は JSON で複製できる Session オブジェクトとして扱う(UNDOは過去状態の復元)。保存は `Store`(localStorage)、画面は `js/ui-*.js` が Engine を呼ぶだけにする。テストはブラウザで開く `tests/index.html` で実行する(PCにNode.jsがないため)。

**Tech Stack:** 素のHTML/CSS/JavaScript(ES5相当、`var`/`function`、グローバル名前空間 `Engine` `Store` `UI`)、PWA(manifest + service worker)、GitHub Pages。ビルド・依存パッケージなし。

**Spec:** `docs/superpowers/specs/2026-11-20-poker-tracker-design.md`

## Global Constraints

- 新しすぎるJS構文は使わない: アロー関数、`let/const`、テンプレートリテラル、`?.`、`??`、`class` は使わない(iPad Safari対策)。
- UI表記は英語: ALL IN / CALL / CHECK / RAISE / FOLD / POT / NEXT ROUND / SHOWDOWN / UNDO / 7-2 BONUS。
- 色は白黒が基本、差し色は緑のみ。素っ気ない見た目(影・グラデーション・角丸の多用をしない)。
- ポットは背景に大きく薄く常時表示。
- 対象は横向き: iPad Air 11インチ、スマホ横向き。縦向きでは「Rotate your device」と表示する。
- 残高は収支。全員0から始まり、マイナス可、下限なし。全員の残高の合計は常に0。
- 金額はすべて整数(円)。
- サイドポットなし。ALL IN は「1ハンドの合計賭け額が上限に達するまで出す」。
- データは端末のlocalStorageのみ。キー名: `pt.players`, `pt.session`。

## Review Focus

1. 山分けでポットが割り切れない(例: 1,000円を3人): 余りは席順で先の勝者に1円ずつ配る。合計は常に一致する。
2. 参加者が2人だけ(ヘッズアップ): ブラインド役の次の人が先に動き、ブラインド役はオプションを持つ。
3. 全員が ALL IN 済み、または1人を除き全員 ALL IN 済み: ラウンドが自動で終わり、行動不能で固まらない。
4. UNDO: ハンド開始直後、ラウンド跨ぎ、SHOWDOWN確定後(残高が元に戻る)、再読み込み後。
5. 入力不正: 空の名前、重複名、極端に長い名前、レイズ幅0やマイナス、ALL IN上限がレイズ幅未満、残高調整に非数値。
6. localStorage が使えない(プライベートブラウズ等): 画面上部に警告を出し、アプリは落とさない。
7. ハンド途中でページを再読み込み: 同じ手番・同じポットで再開する。

---

## ファイル構成

| ファイル | 責務 |
|---|---|
| `index.html`, `style.css` | 画面の骨組みと白黒スタイル、横向き専用表示 |
| `js/engine.js` | ルール計算(純粋関数)。Session を受けて新しい Session を返す |
| `js/store.js` | localStorage の読み書き、プレイヤー管理 |
| `js/ui-players.js` | プレイヤー登録・削除・残高調整画面 |
| `js/ui-setup.js` | ゲーム設定画面(参加者を席順にタップ、レイズ幅、ALL IN上限) |
| `js/ui-game.js` | ゲーム画面、SHOWDOWN確認画面 |
| `js/ui-summary.js` | セッション集計とハンド履歴 |
| `js/app.js` | 画面遷移、起動時の復元 |
| `manifest.json`, `sw.js`, `icons/` | PWA |
| `tests/index.html`, `tests/runner.js`, `tests/engine.test.js`, `tests/store.test.js` | ブラウザ実行のテスト |

テスト実行: プロジェクトのルートで `python -m http.server 8000` を起動し、ブラウザで `http://localhost:8000/tests/` を開く。ページ先頭に `PASS n / FAIL 0` と出れば成功。

---

### Task 1: テスト基盤、Store、プロジェクト骨組み

**Files:**
- Create: `tests/index.html`, `tests/runner.js`, `tests/store.test.js`, `js/store.js`, `index.html`, `style.css`

**Interfaces:**
- Produces(`tests/runner.js`): `test(name, fn)`, `assertEq(actual, expected, msg?)`(深い比較)、`assertThrows(fn)`。`tests/index.html` は全 `*.test.js` を読み込み、`PASS n / FAIL m` と失敗の詳細を表示。
- Produces(`js/store.js`、グローバル `Store`):
  - `Store.available() -> boolean`
  - `Store.loadPlayers() -> Array<{id:string, name:string, balance:number}>`
  - `Store.addPlayer(name:string) -> Player`(前後の空白除去。空、21文字以上、既存と同名は `Error` を投げる。balance は0)
  - `Store.removePlayer(id)`、`Store.adjustBalance(id, delta:number)`(整数以外は `Error`)、`Store.setBalances(map:{id:number})`
  - `Store.saveSession(session)`、`Store.loadSession() -> Session|null`、`Store.clearSession()`
  - テスト用に `Store._useBackend(obj|null)` で `getItem/setItem/removeItem` を差し替えられる。

- [ ] **Step 1: テストランナーを書く**(`tests/runner.js` と `tests/index.html`)。ランナー自体の確認として、わざと失敗するテストで赤く表示されることを1回確認してから消す。
- [ ] **Step 2: `tests/store.test.js` に失敗するテストを書く**
  - `addPlayer(' Alice ')` は名前 `Alice`、balance 0 を返し、`loadPlayers()` に永続される(差し替えバックエンドで再読込しても残る)
  - 空文字・空白のみ・21文字の名前・重複名(`alice` と `Alice` も同名扱い)で `assertThrows`
  - `adjustBalance(id, -1000)` で残高 -1000、`adjustBalance(id, 1.5)` と `adjustBalance(id, 'x')` で throw
  - `removePlayer` 後に `loadPlayers()` から消える
  - `_useBackend(null)` のとき `available()` が false で、`loadPlayers()` は `[]` を返し throw しない
  - `saveSession` → `loadSession` で同じ内容が返り、`clearSession` 後は null
- [ ] **Step 3: テストが失敗することを確認する**(`http://localhost:8000/tests/` で FAIL)
- [ ] **Step 4: `js/store.js` を実装する。** id は `Date.now()` と乱数から生成。すべての読み書きは try/catch で囲み、失敗時は `available()` を false にして握りつぶす。
- [ ] **Step 5: `index.html` と `style.css` の骨組みを作る。** 画面は `<section id="screen-players|setup|game|summary">` を `app.js` が切り替える。`@media (orientation: portrait)` で「Rotate your device」だけを表示する。白背景・黒文字・フォント sans-serif、ボタンは黒枠の角ばった形。
- [ ] **Step 6: テストが全て通ることを確認する**(`FAIL 0`)
- [ ] **Step 7: コミットする**(`git add -A && git commit -m "feat: test runner, store, app skeleton"`)

---

### Task 2: Engine — セッション開始とハンド開始

**Files:**
- Create: `js/engine.js`, `tests/engine.test.js`(`tests/index.html` に読み込みを追加)

**Interfaces:**
- Produces(グローバル `Engine`):
  - `Engine.newSession(opts:{players:Array<{id,name}>(席順), balances:{[id]:number}, step:number, limit:number}) -> Session`。`step` は1以上の整数、`limit` は `step` 以上の整数、players は2人以上。違反は `Error`。
  - `Session = { seats:[{id,name}], startBalances:{id:n}, balances:{id:n}, step, limit, blindIdx:-1, hand:null, hands:[], undo:[] }`(`balances` は確定済み残高)
  - `Hand = { n:number, blindIdx, round:number, phase:'betting'|'roundEnd'|'showdown', turnIdx:number, currentBet:number, roundBets:{id:n}, bets:{id:n}, folded:{id:true}, allIn:{id:true}, acted:{id:true}, log:[{id,type,amount}] }`
  - `Engine.startHand(s) -> Session`: `blindIdx` を `(blindIdx+1) % seats.length` に進める(最初のハンドは席順の先頭が役)。ブラインド役は `step` を自動で賭ける(`log` に type `'blind'`)。`currentBet = step`、`turnIdx` はブラインド役の次の席、`round = 1`、`phase = 'betting'`。`hand` が存在し未精算なら `Error`。
  - `Engine.balances(s) -> {id:n}`: 確定済み残高から、進行中ハンドの `bets` を引いた現在の表示用残高。

- [ ] **Step 1: 失敗するテストを書く**
  - 3人(A,B,C)、step 100、limit 1000、balances すべて0。`startHand` 後: `hand.blindIdx === 0`、A の `bets` は100、`balances` で A は -100、`currentBet === 100`、`turnIdx === 1`
  - 2回目のハンド(精算後の想定として `hand = null` にしたものを使う): `blindIdx === 1`、3回目 `2`、4回目 `0` に戻る
  - 2人のとき、ブラインド役の次の人(`turnIdx`)が先に動く
  - `newSession` の入力不正(1人、step 0、limit < step)で throw
  - `balances` の合計は常に `-(進行中ハンドの bets 合計)` + 確定残高の合計(0)
- [ ] **Step 2: テストが失敗することを確認する**
- [ ] **Step 3: `js/engine.js` を実装する。** 全関数は入力を JSON で複製してから変更し、新しいオブジェクトを返す(元を変更しない)。`undo` スタックには変更前のセッション(`undo` を除く)を JSON 文字列で積む(最大50件)。この仕組みは Task 4 の `undo` が使う。
- [ ] **Step 4: テストが通ることを確認する**
- [ ] **Step 5: コミットする**

---

### Task 3: Engine — 行動とラウンド進行

**Files:**
- Modify: `js/engine.js`, `tests/engine.test.js`

**Interfaces:**
- Consumes: Task 2 の `Session` / `Hand`。
- Produces:
  - `Engine.legal(s) -> { id, toCall:number, canCheck:boolean, minRaiseTo:number|null, maxRaiseTo:number|null }`。`toCall = min(currentBet - roundBets[id], limit - bets[id])`。`canCheck = (toCall === 0)`。`minRaiseTo = currentBet + step`、`maxRaiseTo = limit - bets[id] + roundBets[id]`。ただし `minRaiseTo > maxRaiseTo` のとき両方 `null`(レイズ不可で、ALL IN のみ)。
  - `Engine.act(s, a:{type:'call'|'check'|'raise'|'allin'|'fold', raiseTo?:number}) -> Session`。違法な操作は `Error`(手番でない、`check` が `toCall > 0` のとき、`raiseTo` が `currentBet + step` の倍数でないまたは範囲外、など)。
  - `Engine.nextRound(s) -> Session`: `phase` が `'roundEnd'` のときだけ有効。`roundBets` を空に、`currentBet = 0`、`acted` を空に、`round + 1`、`turnIdx` はブラインド役の次から数えて最初の「フォールドも ALL IN もしていない人」。
  - `Engine.toShowdown(s) -> Session`: `phase` が `'roundEnd'` のときに `'showdown'` に進める。

ラウンド終了判定: フォールドも ALL IN もしていない全員が `acted` で、かつ `roundBets === currentBet` のとき `phase = 'roundEnd'`。ブラインド役は最初のラウンドでも `acted` に入っていないので、一周して戻ると CHECK または RAISE ができる。残りが1人になったら即 `phase = 'showdown'`(自動勝者)。残りの全員が ALL IN 済み(または1人を除き全員)なら `phase = 'roundEnd'` を飛ばして `'showdown'` に進む。レイズが入ると、他の全員の `acted` を解除する。

- [ ] **Step 1: 失敗するテストを書く**(各ケースは `newSession` → `startHand` から始める)
  - 3人: A がブラインド(100)。B `call` → C `raise` to 300 → A `call` → B `call` で `phase === 'roundEnd'`、ポット合計 900
  - ブラインド役のオプション: 全員 `call` 後、ブラインド役が `check` するまで `roundEnd` にならない
  - 全員が `call` しただけの場合も、ブラインド役が `check` で `roundEnd`
  - `check` を `toCall > 0` で行うと throw。手番でない人の操作は throw(`act` は常に `turnIdx` の席のみ)
  - `raise` で `raiseTo: 250`(step 100 の倍数でない)は throw
  - `allin` の後、その人の `bets` は `limit`、`allIn` に入り、以降は手番が飛ばされる
  - 1人を残して全員 `fold` で `phase === 'showdown'`
  - ヘッズアップ: B が先に動き、B `call`、A `check` で `roundEnd`
  - 全員が ALL IN: `phase === 'showdown'` に直接進む(固まらない)
  - `nextRound` 後の `currentBet === 0`、`legal(s).canCheck === true`、最初の手番はブラインド役の次のフォールドしていない人
  - 賭け額が `limit` を超えない(`call` が不足分に丸められる)
- [ ] **Step 2: テストが失敗することを確認する**
- [ ] **Step 3: `legal` / `act` / `nextRound` / `toShowdown` を実装する。** すべての `act` は `log` に `{id, type, amount}` を追記し、`undo` スタックに変更前を積む。
- [ ] **Step 4: テストが通ることを確認する**
- [ ] **Step 5: コミットする**

---

### Task 4: Engine — 精算、7-2 BONUS、UNDO

**Files:**
- Modify: `js/engine.js`, `tests/engine.test.js`

**Interfaces:**
- Produces:
  - `Engine.settle(s, o:{winners:string[], bonus72?:boolean}) -> Session`。`phase === 'showdown'` のときだけ有効。勝者は、フォールドしていない人から選ぶ(それ以外は throw)。
    - ポット = `bets` の合計。勝者が複数なら `floor(pot / k)` ずつ、余りは席順で先の勝者から1円ずつ。
    - `bonus72` が true のとき: 勝者は1人のみ(複数なら throw)。負け側(`bets > 0` で勝者でない全員、フォールド済み含む)がそれぞれ、自分の `bets` をもう一度払う。勝者はポットと追加分を受け取る。
    - `s.balances` を更新し、`hands` に `{ n, blind:id, pot, winners, bonus72, deltas:{id:n}, log }` を追加して、`hand = null` にする。
  - `Engine.canUndo(s) -> boolean`、`Engine.undo(s) -> Session`: `undo` スタックから1つ戻す(ハンド開始、行動、ラウンド進行、精算のすべてが対象)。
  - `Engine.sessionResult(s) -> Array<{id, name, net:number}>`: `balances - startBalances`。

- [ ] **Step 1: 失敗するテストを書く**
  - 3人、A/B/C が各300を賭けて(pot 900)、B が勝者: `deltas` は A -300、B +600、C -300。合計0
  - 7-2: 同条件で B が7-2勝利 → A -600、B +1200、C -600。合計0
  - 山分け: pot 1000 を A,B,C で3分配 → 334, 333, 333。合計が pot と一致(Review Focus 1)
  - 山分け + `bonus72: true` は throw
  - フォールドした人は勝者に選べない(throw)。自動勝者(全員フォールド)でも `settle` が通る
  - `settle` 後は `Engine.balances(s)` の合計が0、`hands.length === 1`、`hand === null`
  - UNDO: `settle` 直後の `undo` で残高が精算前に戻り `hands.length === 0`(Review Focus 4)。ハンド開始直後の `undo` は `hand === null` に戻る。`undo` スタックが空のとき `canUndo` は false で、`undo` は throw
  - 3回精算して合計が0のまま
- [ ] **Step 2: テストが失敗することを確認する**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: テストが通ることを確認する**
- [ ] **Step 5: コミットする**

---

### Task 5: プレイヤー管理画面とゲーム設定画面

**Files:**
- Create: `js/ui-players.js`, `js/ui-setup.js`, `js/app.js`
- Modify: `index.html`, `style.css`

**Interfaces:**
- Consumes: `Store` の全関数、`Engine.newSession`、`Engine.startHand`。
- Produces: `UI.showScreen(name:'players'|'setup'|'game'|'summary')`(`app.js`)、`UI.players.render()`、`UI.setup.render()`。ゲーム開始ボタンで `Engine.newSession` → `Engine.startHand` → `Store.saveSession` → `UI.showScreen('game')`。

- [ ] **Step 1: プレイヤー画面を実装する。** 名前入力と ADD ボタン、一覧(名前、残高、ADJUST、DELETE)。残高はマイナスなら `-1,000` と表示し、`Store` の例外はメッセージを画面に出す(アラート不使用)。DELETE は確認ダイアログを出す。
- [ ] **Step 2: 設定画面を実装する。** 登録者を一覧で表示し、**タップした順に番号が付く**(席順)。もう一度タップで外せる。入力欄は RAISE STEP(初期100)と ALL IN LIMIT(初期1000)。START は参加者2人以上かつ入力が有効なときだけ押せる。不正値は欄の下に赤ではなく黒の文字でエラーを出す。
- [ ] **Step 3: `app.js` で起動処理を実装する。** 保存済みの `pt.session` があれば「Resume / Discard」を出し、なければプレイヤー画面を表示する。`Store.available()` が false なら画面上部に警告帯を出す(Review Focus 6)。
- [ ] **Step 4: ブラウザで確認する。** `python -m http.server 8000` を起動し、`http://localhost:8000/` でプレイヤー3人を追加 → 設定で席順をタップ → START できること、再読み込みしてもプレイヤーが残ることを確認する。不正入力(空名、重複名、step 0)でエラー表示が出ること。
- [ ] **Step 5: コミットする**

---

### Task 6: ゲーム画面と SHOWDOWN

**Files:**
- Create: `js/ui-game.js`
- Modify: `index.html`, `style.css`, `js/app.js`

**Interfaces:**
- Consumes: `Engine.legal` / `act` / `nextRound` / `toShowdown` / `settle` / `startHand` / `undo` / `canUndo` / `balances`、`Store.saveSession`。
- Produces: `UI.game.render(session)`。操作のたびに新しい Session を `Store.saveSession` で保存してから再描画する。

- [ ] **Step 1: 画面を実装する。** 背景に POT の金額を大きく薄い灰色で常時表示する(文字より背面)。上部に各プレイヤーの名前と残高(マイナス可、現在の手番は緑の枠、ブラインド役は `B` 印、フォールドは打ち消し線)。下部に CALL(`toCall` を表示。0 のとき CHECK)、RAISE、ALL IN、FOLD の4つの大きなボタンと UNDO。RAISE は `−` / `+` で `minRaiseTo`〜`maxRaiseTo` を `step` 刻みで選び、数値を見せて、確定ボタンで確定する(`minRaiseTo` が null のとき無効)。
- [ ] **Step 2: ラウンドと終了の操作を実装する。** `phase === 'roundEnd'` では NEXT ROUND と SHOWDOWN の2つだけを表示する。`phase === 'showdown'` では SHOWDOWN 確認画面を開く: フォールドしていない人から勝者をタップで選び(自動勝者は選択済み)、小さな「7-2 BONUS」チェックを隅に置く(勝者が複数のときは無効)。CONFIRM で `settle` → `startHand`(次のハンド)。
- [ ] **Step 3: ボタンは最小 64px の高さにする。** iPad で押しやすいため。7-2 BONUS だけは小さくてよい。
- [ ] **Step 4: ブラウザで確認する。** 横向き(幅1180×820 と 812×375 の2サイズ)で、3人で1ハンド通して遊び、合計が0になること、UNDO で戻ること、再読み込みで同じ手番から再開することを確認する。縦向きでは「Rotate your device」のみ表示されること。
- [ ] **Step 5: コミットする**

---

### Task 7: セッション集計とハンド履歴

**Files:**
- Create: `js/ui-summary.js`
- Modify: `index.html`, `style.css`, `js/app.js`, `js/ui-game.js`

**Interfaces:**
- Consumes: `Engine.sessionResult`、`Session.hands`、`Store.setBalances`、`Store.clearSession`。
- Produces: `UI.summary.render(session)`。ゲーム画面に SUMMARY ボタンを追加する。

- [ ] **Step 1: 画面を実装する。** 上段にセッション結果(名前、収支を `+1,200` / `-600` で表示、プラスは緑)。下段にハンド履歴を新しい順で表示する: `#n`、ブラインド役、ポット、勝者、7-2 の印、展開で行動ログ。
- [ ] **Step 2: END SESSION を実装する。** 確認ダイアログのあと、進行中のハンドがあれば破棄し、`Store.setBalances(session.balances)` で確定残高を永久保存、`Store.clearSession()`、プレイヤー画面へ戻る。
- [ ] **Step 3: ブラウザで確認する。** 2ハンド(うち1つは 7-2)を行い、収支と履歴が合っていること、END SESSION 後にプレイヤー画面の残高が更新されることを確認する。
- [ ] **Step 4: コミットする**

---

### Task 8: PWA、公開、README

**Files:**
- Create: `manifest.json`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `index.html`, `README.md`

- [ ] **Step 1: `manifest.json` を作る。** `display: "standalone"`、`orientation: "landscape"`、白黒のアイコン、`start_url: "./"`(GitHub Pages はサブパスで配信されるため、パスはすべて相対にする)。iOS 用に `<meta name="apple-mobile-web-app-capable">` と `apple-touch-icon` を追加する。
- [ ] **Step 2: `sw.js` を作る。** 全アセットを precache し、cache-first で応答する。キャッシュ名にバージョンを入れ、更新時に古いキャッシュを削除する。
- [ ] **Step 3: アイコンを作る。** 黒地に白の文字(例: `$`)の単純な画像を Python で生成する(依存なし、`struct`/`zlib` で PNG を書く、または SVG から作る)。
- [ ] **Step 4: README を更新する。** 使い方(ホーム画面に追加する手順)、ブラウザのデータを消すと残高も消える注意、テストの実行方法。
- [ ] **Step 5: GitHub Pages を有効にして公開する。** `gh api -X POST repos/onhrpc0410-commits/poker-tracker/pages -f "source[branch]=main" -f "source[path]=/"` を実行し、`https://onhrpc0410-commits.github.io/poker-tracker/` が開くことを確認する。
- [ ] **Step 6: 最終確認。** 公開URLで、プレイヤー追加 → 1ハンド → 機内モード相当(オフライン)で再読み込みしても動くことを確認する。iPad 実機でホーム画面に追加し横向きで動くことは、ユーザー自身に確認してもらう。
- [ ] **Step 7: コミットしてpushする**
