import fetch, { RequestInit } from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

interface EndpointRoute {
  data?: string;
  path: string;
}

interface EndpointModel {
  key: string;
  // fields are not strictly typed
}

interface EndpointDefinition {
  method: string;
  route: EndpointRoute;
  parameters?: Record<string, any>;
  model?: EndpointModel;
}

interface ProviderMap {
  url: string;
  endpoints: Record<string, Record<string, EndpointDefinition>>;
}

function interpolate(template: string, context: Record<string, any>): string {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, expr) => {
    const parts = expr.trim().split('.');
    let val: any = context;
    for (const p of parts) {
      if (val == null) return '';
      val = val[p];
    }
    if (val == null) return '';
    return encodeURIComponent(String(val));
  });
}

export class Connector {
  constructor(public name: string, public map: ProviderMap) {}

  async request(endpoint: string, method: string = 'GET', params: Record<string, any> = {}, options: RequestInit = {}): Promise<any> {
    const epGroup = this.map.endpoints[endpoint];
    if (!epGroup) {
      throw new Error(`Unknown endpoint ${endpoint}`);
    }
    const def = epGroup[method];
    if (!def) {
      throw new Error(`Endpoint ${endpoint} does not define a ${method} method`);
    }
    let route = interpolate(def.route.path, params);
    const base = this.map.url.replace(/\/$/, '');
    let url = `${base}/${route.replace(/^\//, '')}`;

    if (def.parameters) {
      const search = new URLSearchParams();
      for (const [key, valTemplate] of Object.entries(def.parameters)) {
        const value = interpolate(String(valTemplate), params);
        if (value) search.append(key, value);
      }
      const query = search.toString();
      if (query) {
        url += (url.includes('?') ? '&' : '?') + query;
      }
    }

    const res = await fetch(url, { method: def.method || method, ...options });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  }
}

export function loadConnectors(directory = path.join(__dirname, '..', 'fixtures', 'maps')): Record<string, Connector> {
  const connectors: Record<string, Connector> = {};
  const files = fs.readdirSync(directory);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf-8')) as ProviderMap;
    connectors[path.basename(file, '.json')] = new Connector(path.basename(file, '.json'), data);
  }
  return connectors;
}
