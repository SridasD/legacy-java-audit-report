"use client";

import { useState } from "react";
import { auditSummary, findings, type Severity } from "@/data/findings";

const severityOrder: Record<Severity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function Home() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("ALL");
  const [category, setCategory] = useState("ALL");

  const categories = [...new Set(findings.map((finding) => finding.category))].sort();
  const needle = query.trim().toLowerCase();
  const filtered = findings
    .filter((finding) => severity === "ALL" || finding.severity === severity)
    .filter((finding) => category === "ALL" || finding.category === category)
    .filter(
      (finding) =>
        !needle ||
        [finding.file, finding.className, finding.method, finding.category, finding.resource, finding.problem]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    )
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.id - b.id);

  return (
    <main>
      <header className="masthead">
        <div>
          <p className="eyebrow">Read-only static code audit</p>
          <h1>Legacy Java Resource Lifecycle Audit</h1>
          <p className="lede">
            Developer-ready evidence and manual correction guidance for JDBC, Hibernate, stream, and HTTP
            resource handling.
          </p>
        </div>
        <div className="audit-stamp">
          <span>Audit date</span>
          <strong>{auditSummary.auditDate}</strong>
        </div>
      </header>

      <section aria-labelledby="coverage-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Coverage</p>
            <h2 id="coverage-title">What was analysed</h2>
          </div>
          <p>Commented code and framework-owned response streams were excluded.</p>
        </div>
        <div className="metrics">
          <Metric value={auditSummary.javaFiles} label="Java files" />
          <Metric value={auditSummary.jdbcFiles} label="JDBC files" />
          <Metric value={auditSummary.hibernateFiles} label="Hibernate files" />
          <Metric value={auditSummary.closeableFiles} label="Closeable-resource files" />
          <Metric value={auditSummary.confirmed} label="Confirmed findings" tone="danger" />
        </div>
      </section>

      <section className="scope-grid">
        <article className="panel">
          <p className="section-kicker">Checked</p>
          <h2>Lifecycle paths</h2>
          <ul>
            <li>Connection, statement and ResultSet ownership</li>
            <li>Normal, exception and early-return paths</li>
            <li>Nested and overwritten resources</li>
            <li>Streams, readers, writers and HTTP clients</li>
          </ul>
        </article>
        <article className="panel">
          <p className="section-kicker">Classification</p>
          <h2>Audit result</h2>
          <div className="classification">
            <span>
              <b>{auditSummary.confirmed}</b> Confirmed
            </span>
            <span>
              <b>{auditSummary.likely}</b> Likely
            </span>
            <span>
              <b>{auditSummary.possible}</b> Possible
            </span>
          </div>
        </article>
      </section>

      <section aria-labelledby="findings-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Developer reference</p>
            <h2 id="findings-title">Findings</h2>
          </div>
          <p>
            {filtered.length} of {findings.length} findings shown
          </p>
        </div>
        <div className="filters">
          <label className="search">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="File, method, resource or problem…"
            />
          </label>
          <label>
            <span>Severity</span>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option>ALL</option>
              <option>HIGH</option>
              <option>MEDIUM</option>
              <option>LOW</option>
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>ALL</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="finding-list">
          {filtered.map((finding) => (
            <details className="finding" key={finding.id}>
              <summary>
                <span className={`badge ${finding.severity.toLowerCase()}`}>{finding.severity}</span>
                <span className="finding-number">#{String(finding.id).padStart(2, "0")}</span>
                <span className="finding-title">
                  <strong>{finding.method}</strong>
                  <small>
                    {finding.file}:{finding.line}
                  </small>
                </span>
                <span className="category">{finding.category}</span>
                <span className="chevron">＋</span>
              </summary>
              <div className="finding-body">
                <div className="metadata">
                  <Meta label="Class" value={finding.className} />
                  <Meta label="Resource" value={finding.resource} />
                  <Meta label="Confidence" value={finding.confidence} />
                </div>
                <Section title="Problem">
                  <p>{finding.problem}</p>
                </Section>
                <Section title="Code evidence">
                  <pre>
                    <code>{finding.evidence}</code>
                  </pre>
                </Section>
                <Section title="Why this matches the reference">
                  <p>{finding.match}</p>
                </Section>
                <Section title="Developer action">
                  <p>{finding.action}</p>
                </Section>
                <Section title="Suggested fix pattern">
                  <pre>
                    <code>{finding.pattern}</code>
                  </pre>
                </Section>
                <div className="two-column">
                  <Section title="Do not change">
                    <ul>
                      {finding.preserve.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Risk / impact">
                    <p>{finding.risk}</p>
                  </Section>
                </div>
                <Section title="Verification checklist">
                  <ul className="checklist">
                    {finding.verify.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Section>
              </div>
            </details>
          ))}
          {!filtered.length && (
            <div className="empty">
              <h3>No matching findings</h3>
              <p>Clear the filters or try a broader search.</p>
            </div>
          )}
        </div>
      </section>

      <footer>
        <p>Detection-only report. No source files were modified by the audit.</p>
        <p>Legacy Java Resource Lifecycle Audit · {auditSummary.auditDate}</p>
      </footer>
    </main>
  );
}

function Metric({ value, label, tone = "" }: { value: number; label: string; tone?: string }) {
  return (
    <article className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
