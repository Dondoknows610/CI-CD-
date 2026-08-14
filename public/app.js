const app = document.getElementById("app");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageExists(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = `${path}?t=${Date.now()}`;
  });
}

async function enrichEvidence(steps) {
  const enriched = [];
  for (const step of steps) {
    const evidence = [];
    for (const item of step.evidence) {
      const path = `./screenshots/${item.filename}`;
      const present = await imageExists(path);
      evidence.push({ ...item, path, present });
    }
    enriched.push({ ...step, evidence });
  }
  return enriched;
}

function renderEvidenceCard(item) {
  const media = item.present
    ? `<button type="button" class="shot" data-full="${escapeHtml(item.path)}" data-caption="${escapeHtml(
        item.caption
      )}" aria-label="Open screenshot: ${escapeHtml(item.title)}">
         <img src="${escapeHtml(item.path)}" alt="${escapeHtml(item.title)}" loading="lazy" />
       </button>`
    : `<div class="shot shot-empty">
         <strong>Screenshot needed</strong>
         <span>${escapeHtml(item.caption)}</span>
         <code>screenshots/${escapeHtml(item.filename)}</code>
       </div>`;

  return `
    <article class="evidence-card">
      <span class="badge ${item.present ? "ready" : "missing"}">
        ${item.present ? "Captured" : "Awaiting upload"}
      </span>
      <h3>${escapeHtml(item.title)}</h3>
      ${media}
      <p>${escapeHtml(item.caption)}</p>
    </article>
  `;
}

function renderStep(step, anchor) {
  return `
    <section class="section" id="${anchor}">
      <p class="section-kicker">Step ${escapeHtml(step.number)}</p>
      <h2>${escapeHtml(step.title)}</h2>
      <p class="lede">${escapeHtml(step.summary)}</p>
      <div class="step-panel">
        <ol class="action-list">
          ${step.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
        </ol>
        <div class="evidence-grid">
          ${step.evidence.map(renderEvidenceCard).join("")}
        </div>
      </div>
    </section>
  `;
}

function render(lab, steps) {
  const [install, agents] = steps;
  const presentCount = steps.flatMap((step) => step.evidence).filter((item) => item.present).length;
  const totalCount = steps.flatMap((step) => step.evidence).length;

  app.innerHTML = `
    <section class="hero" aria-labelledby="brand-hero">
      <p class="brand-hero" id="brand-hero">Wazuh Lab</p>
      <h2>${escapeHtml(lab.title)}</h2>
      <p class="lede">${escapeHtml(lab.courseNote)}</p>
      <p class="lede">Evidence pack: <strong>${presentCount}/${totalCount}</strong> screenshots loaded.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#architecture">View architecture</a>
        <a class="btn btn-ghost" href="#verify">Jump to verification</a>
      </div>
    </section>

    <section class="section" id="architecture">
      <p class="section-kicker">Monitoring targets</p>
      <h2>Three endpoints, one manager</h2>
      <p class="lede">
        The Docker Wazuh stack on the lab VM collects alerts from the hosting laptop,
        the VM itself, and the VPN server configured in the previous assignment.
      </p>
      <div class="arch-grid">
        ${lab.architecture
          .map(
            (node) => `
          <article class="arch-node ${node.id === "vm" ? "hub" : ""}">
            <span class="role">${escapeHtml(node.role)}</span>
            <h3>${escapeHtml(node.label)}</h3>
            <p>${escapeHtml(node.detail)}</p>
          </article>`
          )
          .join("")}
      </div>
      <p class="flow">
        Host laptop agent → VM Docker manager ← VM local agent · VPN server agent → VM Docker manager
      </p>
    </section>

    ${renderStep(install, "install")}
    ${renderStep(agents, "agents")}

    <section class="section" id="verify">
      <p class="section-kicker">Outcome</p>
      <h2>Verification checklist</h2>
      <div class="verify-panel">
        <h3>Agents reporting to the manager</h3>
        <p>
          Success for this lab means the Wazuh dashboard (or agent control list) shows
          active agents for the hosting laptop, the VM, and the VPN server.
        </p>
        <ul class="checklist">
          <li>Docker single-node stack is up (manager, indexer, dashboard)</li>
          <li><code>vm.max_map_count=262144</code> applied on the host</li>
          <li>Laptop agent enrolled and connected</li>
          <li>VM agent enrolled and connected</li>
          <li>VPN server agent enrolled and connected</li>
        </ul>
      </div>
    </section>
  `;

  app.querySelectorAll(".shot[data-full]").forEach((button) => {
    button.addEventListener("click", () => {
      lightboxImage.src = button.dataset.full;
      lightboxImage.alt = button.dataset.caption || "";
      lightboxCaption.textContent = button.dataset.caption || "";
      lightbox.showModal();
    });
  });
}

async function init() {
  try {
    const response = await fetch("./data/lab.json");
    if (!response.ok) throw new Error(`Could not load lab data (${response.status})`);
    const lab = await response.json();
    const steps = await enrichEvidence(lab.steps);
    render(lab, steps);
  } catch (error) {
    app.innerHTML = `<p class="error">Failed to load the demonstration. ${escapeHtml(
      error.message
    )}</p>`;
  }
}

init();
