# AFTER HOURS

**A photo leaks on your first night as an idol manager.**

Call the member first, stay quiet, or go public. Write your own response and see how the group and its fans react the next day.

- **[Play free in your browser](https://piedrarojagroup-tech.github.io/after-hours/play/)**. No download, account, or API key needed. On the welcome screen, choose **Open the fixed NOVA sample** for the NOVA community, artist feed, and private messages.
- **[Download the Windows demo](https://piedrarojagroup-tech.github.io/after-hours/AFTER-HOURS-windows.zip)**. Play the NOVA sample as-is, or [set up your own AI model](docs/README.md#download-for-windows-and-connect-your-ai) for live chat.

<img src="docs/play/assets/after-hours-key-art.png" width="560" alt="Three idols backstage as a leaked photo spreads on a phone">

The simulation engine, save format, and AI connectors are open source under the [MIT license](LICENSE). The downloadable core is also covered by MIT. The demos and artwork are available to play and download, with all other rights reserved.

<details>
<summary>Developer guide</summary>

Run the idol-management simulation on your own machine. This developer preview contains the event engine, versioned saves, generated sample characters, and the adapter that turns a manager’s instruction into a draft.

### Run and debug

Install Node.js 22 or newer. From the extracted folder, run:

```sh
node play.cjs
node --test test-event-sim.cjs
```

The example creates a fictional group from the repeatable seed `storm`, drafts a private response, confirms it, advances to Day 2, and reloads the save in memory. You can pass your own direction as a quoted argument. Run `node --inspect-brk play.cjs` to stop at startup and step through the same example in a Node debugger.

### Connect a model

Copy `.env.example` to `.env.local`. Set `AI_DRAFT_PROVIDER` to `GEMINI`, `MINIMAX`, or `OPENAI` and fill in its API key. Keep multiple configurations in the same file and change the provider name to switch.

```sh
node play.cjs --ai "Keep this private and talk to them first."
```

For another Chat Completions-compatible provider, set `AI_DRAFT_PROVIDER=CUSTOM` and fill in `CUSTOM_BASE_URL`, `CUSTOM_CHAT_MODEL`, and `CUSTOM_API_KEY`. Use the base URL without `/chat/completions`. A local service on localhost can leave the key blank. The selected provider receives the sample event, relevant game context, and your direction when you use `--ai`.

### Reuse the engine in your own game

```js
const sim = require('./event-sim');
const state = sim.fresh({ seed: 'storm' });
const draft = sim.propose(state, 'Talk to the group in private.');
console.log(draft);
sim.confirm(state);
sim.advance(state);
const restored = sim.restore(JSON.stringify(state));
```

- `event-sim.js` owns state and consequences. `restore` accepts a version 1 save as JSON or an object and returns a validated copy or `null`.
- `event-sim-ai.cjs` builds the context and validates the suggested action. `proposeEvent(input, provider, model, source)` accepts your own `provider(endpoint, body, timeoutMs)` function. Return model JSON as an `output_text` item in `{ output: [{ content: [{ type: 'output_text', text: '…' }] }] }`.
- `ai-provider.cjs` supplies the built-in provider adapters. The preview CLI applies confirmation and time advancement explicitly after the draft. An interactive client can keep those calls under player control.

</details>
