# poker-tracker

友人との賭けポーカーの収支を記録・集計する、iPad/スマホ横向き用のWebアプリ。
トランプは現物を使う前提で、お金の動きだけを扱う。

## 使い方
1. Players 画面で参加者を登録(残高は 0 円から)。
2. NEW GAME で座っている順にタップし、RAISE STEP と ALL IN LIMIT を決めて START。
3. 手番の人のボタン(CALL / CHECK / RAISE / ALL IN / FOLD)を押して進める。ブラインド役は毎ハンド反時計回りに移る。
4. SHOWDOWN で勝者を選んで CONFIRM(7-2 で勝ったときだけ小さな「7-2 BONUS」にチェック)。
5. SUMMARY で今日の勝ち負けとハンド履歴。END SESSION で残高を確定。

## iPad / スマホで使う
公開URLをSafariで開き、共有ボタンから「ホーム画面に追加」。以後はオフラインでも動く。
データは端末のブラウザ内(localStorage)にだけ保存される。**ブラウザのサイトデータを消すと残高も消える**ので注意。

## 開発
ビルド不要。テストはブラウザで実行する:

```bash
python -m http.server 8000
```

`http://localhost:8000/tests/` を開き、`RESULT PASS n / FAIL 0` を確認する。
設計書: `docs/superpowers/specs/`、実装計画: `docs/superpowers/plans/`
