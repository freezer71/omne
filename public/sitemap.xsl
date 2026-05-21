<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>omne — sitemap</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <style>
          :root {
            color-scheme: light dark;
            --fg: #111;
            --fg-muted: #5b5b5b;
            --bg: #fafafa;
            --surface: #fff;
            --border: #e4e4e4;
            --accent: #0b0b0b;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --fg: #ededed;
              --fg-muted: #9a9a9a;
              --bg: #0e0e0e;
              --surface: #161616;
              --border: #2a2a2a;
              --accent: #ededed;
            }
          }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
          body {
            font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            padding: 2rem 1.25rem 4rem;
          }
          .wrap { max-width: 1100px; margin: 0 auto; }
          header { margin-bottom: 1.5rem; }
          h1 {
            font-size: 1.5rem;
            margin: 0 0 .25rem;
            letter-spacing: -0.01em;
          }
          .meta {
            color: var(--fg-muted);
            margin: 0;
          }
          .count {
            display: inline-block;
            margin-left: .5rem;
            padding: 0 .5em;
            border: 1px solid var(--border);
            border-radius: 999px;
            font-variant-numeric: tabular-nums;
            color: var(--fg);
          }
          .table-wrap {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          thead th {
            position: sticky;
            top: 0;
            background: var(--surface);
            text-align: left;
            font-weight: 600;
            color: var(--fg-muted);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.04em;
            padding: .75rem 1rem;
            border-bottom: 1px solid var(--border);
          }
          tbody td {
            padding: .65rem 1rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }
          tbody tr:last-child td { border-bottom: 0; }
          tbody tr:hover { background: rgba(127, 127, 127, 0.06); }
          td.url { word-break: break-all; }
          td.url a {
            color: var(--accent);
            text-decoration: none;
            border-bottom: 1px solid transparent;
          }
          td.url a:hover { border-bottom-color: var(--accent); }
          td.url a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
          td.num { font-variant-numeric: tabular-nums; color: var(--fg-muted); white-space: nowrap; }
          td.alts { white-space: nowrap; }
          .lang {
            display: inline-block;
            margin-right: .25rem;
            padding: 0 .45em;
            border: 1px solid var(--border);
            border-radius: 999px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: var(--fg-muted);
          }
          footer {
            margin-top: 1.5rem;
            color: var(--fg-muted);
            font-size: 12px;
          }
          footer a { color: inherit; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <h1>omne — tools</h1>
            <p class="meta">
              XML sitemap. The raw file is machine-readable — this view is for humans.
              <span class="count">
                <xsl:value-of select="count(sm:urlset/sm:url)"/>
                <xsl:text> URLs</xsl:text>
              </span>
            </p>
          </header>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Last modified</th>
                  <th>Change freq.</th>
                  <th>Priority</th>
                  <th>Alternates</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sm:urlset/sm:url">
                  <tr>
                    <td class="url">
                      <a>
                        <xsl:attribute name="href"><xsl:value-of select="sm:loc"/></xsl:attribute>
                        <xsl:value-of select="sm:loc"/>
                      </a>
                    </td>
                    <td class="num"><xsl:value-of select="substring(sm:lastmod, 1, 10)"/></td>
                    <td class="num"><xsl:value-of select="sm:changefreq"/></td>
                    <td class="num"><xsl:value-of select="sm:priority"/></td>
                    <td class="alts">
                      <xsl:for-each select="xhtml:link[@rel='alternate']">
                        <span class="lang"><xsl:value-of select="@hreflang"/></span>
                      </xsl:for-each>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>

          <footer>
            <p>
              Generated by omne. Specification:
              <a href="https://www.sitemaps.org/protocol.html">sitemaps.org</a>.
            </p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
