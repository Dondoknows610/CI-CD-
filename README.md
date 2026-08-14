# Wazuh Lab Demonstration

Static walkthrough of Julio Arredondo’s Wazuh monitoring lab:

- Wazuh **v4.14.7 OVA** manager/dashboard in VirtualBox (`10.225.42.4`)
- Active agents: **WinVM** (Windows 11, `10.225.42.3`) and **vpn-server** (Ubuntu, `10.225.42.1`)

## Run locally

```bash
npm start
```

Open [http://localhost:4173](http://localhost:4173).

## Screenshots

Copy evidence images into `public/screenshots/` using these filenames:

| File | What it shows |
| --- | --- |
| `01-ova-services-running.png` | `wazuh-dashboard` + `wazuh-manager` active on the OVA |
| `02-deploy-new-agent.png` | Dashboard “Deploy new agent” page |
| `03-agent-vpn-install.png` | VPN host `dpkg` install as `vpn-server` → `10.225.42.4` |
| `04-agents-endpoints-active.png` | Endpoints view with WinVM + vpn-server active |
