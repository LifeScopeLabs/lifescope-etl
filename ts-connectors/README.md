# ETL Connectors

This small TypeScript library bundles the provider definitions found in
`fixtures/maps` and exposes a simple API for calling their endpoints.
The fixture JSON files are included in the published package so the
connectors work out of the box.

```
npm install
npm run build
```

Example usage:

```ts
import { loadConnectors } from './dist';

const connectors = loadConnectors();
const github = connectors['github'];

// Fetch user events
github.request('Events', 'GET', { username: 'octocat' }).then(console.log);
```

The connectors dynamically build request URLs based on the definitions in the fixture JSON files.
