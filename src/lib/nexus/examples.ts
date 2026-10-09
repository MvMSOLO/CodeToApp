export const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lumen Index</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font-family: "Iowan Old Style", Palatino, Georgia, serif;
      background: #10141c;
      color: #f3f0e8;
      overflow: hidden;
    }
    canvas { position: fixed; inset: 0; width: 100%; height: 100%; }
    main {
      position: relative;
      z-index: 1;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 28px 22px 36px;
      gap: 18px;
    }
    .kicker {
      font-family: ui-sans-serif, system-ui, sans-serif;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-size: 11px;
      color: #9aa3b2;
    }
    h1 { font-size: 44px; line-height: 0.95; font-weight: 500; margin: 0; max-width: 10ch; }
    p { margin: 0; max-width: 28ch; color: #c9c3b6; font-size: 17px; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    button {
      font: inherit;
      background: #ff6a3d;
      color: #1a0d08;
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-weight: 650;
      font-size: 15px;
    }
    strong { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 28px; font-weight: 600; }
    .card {
      background: rgba(20, 24, 32, 0.78);
      border: 1px solid rgba(243, 240, 232, 0.12);
      border-radius: 22px;
      padding: 16px 16px 14px;
      backdrop-filter: blur(8px);
    }
  </style>
</head>
<body>
  <canvas id="field"></canvas>
  <main>
    <p class="kicker">Sealed HTML</p>
    <h1>Lumen Index</h1>
    <p>A self-contained page. Markup, paint, and a small script, running inside the frame.</p>
    <div class="card">
      <div class="row">
        <div>
          <div class="kicker">Open seats</div>
          <strong id="count">4</strong>
        </div>
        <button id="add" type="button">Hold one</button>
      </div>
    </div>
  </main>
  <script>
    var canvas = document.getElementById("field");
    var ctx = canvas.getContext("2d");
    var seats = 4;
    function size() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    size();
    window.addEventListener("resize", size);
    function frame(t) {
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,106,61,0.55)";
      ctx.lineWidth = 1.25;
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        var y = h * (0.18 + i * 0.14);
        for (var x = 0; x <= w; x += 8) {
          var wave = Math.sin(x * 0.01 + t * 0.001 + i) * (18 + i * 6);
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.getElementById("add").addEventListener("click", function () {
      seats += 1;
      document.getElementById("count").textContent = String(seats);
      console.log("seats", seats);
    });
  </script>
</body>
</html>
`;

const seal = (depth: number): Record<string, unknown> =>
  depth <= 0
    ? { type: "text", text: "Nested seal · depth held", style: { fontSize: 12, color: "#9aa3b2" } }
    : {
        type: "box",
        style: {
          padding: 8,
          borderRadius: 14,
          border: "1px solid #343c4e",
          rotateZ: depth % 2 === 0 ? -1.2 : 1.2,
        },
        child: seal(depth - 1),
      };

const jsonValue = {
  title: "Field Atelier",
  background: "#12151c",
  state: { screen: "shop", cart: 0, liked: false, note: "", filter: "all" },
  data: {
    pieces: [
      { name: "Coil Lamp", price: 180, tag: "light", blurb: "Brass stem, linen shade, a quiet pool of light." },
      { name: "Slate Vessel", price: 92, tag: "object", blurb: "Hand-thrown, charcoal glaze, low foot." },
      { name: "Oak Rail", price: 240, tag: "object", blurb: "A shelf that steps back into the wall." },
      { name: "Paper Globe", price: 64, tag: "light", blurb: "Folded shade. Warm LED. Almost weightless." },
    ],
  },
  screens: {
    shop: {
      type: "column",
      fill: true,
      onSwipeLeft: { op: "nav", to: "bag" },
      style: { background: "#12151c", color: "#f3f0e8", height: "100%" },
      children: [
        {
          type: "row",
          align: "center",
          justify: "space-between",
          style: { padding: 20, paddingBottom: 4 },
          children: [
            { type: "text", text: "Field Atelier", style: { fontSize: 20, fontWeight: 650 } },
            {
              type: "button",
              text: "Bag {{cart}}",
              onTap: { op: "nav", to: "bag" },
              style: {
                background: "transparent",
                color: "#f3f0e8",
                border: "1px solid #3a4254",
                borderRadius: 999,
              },
            },
          ],
        },
        {
          type: "scroll",
          fill: true,
          child: {
            type: "column",
            gap: 14,
            style: { padding: 20 },
            children: [
              {
                type: "text",
                role: "h1",
                text: "Objects for a quieter room.",
                animate: { enter: "fade-up" },
                style: { fontSize: 32, fontWeight: 600, letterSpacing: -0.6 },
              },
              {
                type: "text",
                text: "Swipe the stage toward the bag. Showing {{filter}}.",
                animate: { enter: "fade-up", delay: 70 },
                style: { color: "#9aa3b2", fontSize: 15 },
              },
              { type: "scene3d", height: 168, animate: { enter: "scale", delay: 90 } },
              {
                type: "row",
                gap: 8,
                children: [
                  {
                    type: "button",
                    text: "All",
                    onTap: { op: "set", key: "filter", value: "all" },
                    style: { borderRadius: 999, background: "#242b38", color: "#f3f0e8" },
                  },
                  {
                    type: "button",
                    text: "Light",
                    onTap: { op: "set", key: "filter", value: "light" },
                    style: { borderRadius: 999, background: "#242b38", color: "#f3f0e8" },
                  },
                  {
                    type: "button",
                    text: "Object",
                    onTap: { op: "set", key: "filter", value: "object" },
                    style: { borderRadius: 999, background: "#242b38", color: "#f3f0e8" },
                  },
                ],
              },
              {
                type: "for",
                each: "pieces",
                as: "item",
                template: {
                  type: "if",
                  when: "filter == 'all' || item.tag == filter",
                  then: {
                    type: "box",
                    animate: { enter: "fade-up", stagger: 60 },
                    style: { background: "#1c222c", borderRadius: 18, padding: 16, shadow: 22 },
                    children: [
                      {
                        type: "row",
                        align: "center",
                        justify: "space-between",
                        children: [
                          { type: "text", text: "{{item.name}}", style: { fontSize: 18, fontWeight: 600 } },
                          {
                            type: "text",
                            text: "{{item.price}}",
                            style: { color: "#ff6a3d", fontWeight: 600, fontFamily: "IBM Plex Mono, ui-monospace, monospace" },
                          },
                        ],
                      },
                      { type: "text", text: "{{item.blurb}}", style: { color: "#9aa3b2", fontSize: 14, marginTop: 6 } },
                      {
                        type: "button",
                        text: "Hold",
                        onTap: { op: "inc", key: "cart", by: 1 },
                        style: { marginTop: 12, borderRadius: 999 },
                      },
                    ],
                  },
                },
              },
              {
                type: "row",
                gap: 12,
                align: "center",
                children: [
                  { type: "lottie", width: 84, height: 84 },
                  {
                    type: "text",
                    text: "The coil is wound by hand, then left to cool overnight.",
                    style: { color: "#9aa3b2", fontSize: 14, flex: 1 },
                  },
                ],
              },
              {
                type: "box",
                style: {
                  padding: 16,
                  borderRadius: 18,
                  background: "linear-gradient(160deg, #2a211c, #1c222c)",
                  rotateY: 14,
                  rotateX: 8,
                  perspective: 800,
                },
                children: [
                  { type: "text", text: "Tilted stock card", style: { fontWeight: 600 } },
                  {
                    type: "text",
                    text: "A 3D transform from the schema, not an image.",
                    style: { color: "#9aa3b2", fontSize: 14, marginTop: 4 },
                  },
                ],
              },
              { type: "text", text: "Note for the bench", style: { fontSize: 13, color: "#9aa3b2" } },
              { type: "input", bind: "note", placeholder: "Glaze, timing, delivery…" },
              {
                type: "row",
                align: "center",
                justify: "space-between",
                children: [
                  { type: "text", text: "Keep the lamp", style: { fontSize: 16 } },
                  { type: "toggle", bind: "liked" },
                ],
              },
              {
                type: "drag",
                child: {
                  type: "box",
                  style: { padding: 14, borderRadius: 16, background: "#ff6a3d" },
                  children: [
                    { type: "text", text: "Drag this seal", style: { fontWeight: 700, color: "#1a0d08" } },
                  ],
                },
              },
              seal(5),
            ],
          },
        },
      ],
    },
    bag: {
      type: "column",
      fill: true,
      style: { background: "#12151c", color: "#f3f0e8", height: "100%", padding: 20, gap: 12 },
      children: [
        { type: "text", role: "h1", text: "Holding", animate: { enter: "fade-up" }, style: { fontSize: 34, fontWeight: 600 } },
        {
          type: "if",
          when: "cart > 0",
          then: { type: "text", text: "{{cart}} pieces on the bench.", style: { fontSize: 18 } },
          else: { type: "text", text: "Nothing held yet. The floor is clear.", style: { color: "#9aa3b2", fontSize: 16 } },
        },
        {
          type: "if",
          when: "liked",
          then: { type: "text", text: "The lamp is marked to keep." },
          else: { type: "text", text: "Lamp not marked.", style: { color: "#9aa3b2" } },
        },
        {
          type: "if",
          when: "note != ''",
          then: {
            type: "box",
            style: { padding: 14, borderRadius: 14, background: "#1c222c" },
            children: [{ type: "text", text: "Note · {{note}}" }],
          },
          else: { type: "text", text: "No bench note.", style: { color: "#9aa3b2" } },
        },
        {
          type: "button",
          text: "Back to the floor",
          onTap: { op: "nav", to: "shop" },
          style: { borderRadius: 999, marginTop: 8 },
        },
        {
          type: "button",
          text: "Release all",
          onTap: { op: "set", key: "cart", value: 0 },
          style: { background: "transparent", color: "#f3f0e8", border: "1px solid #3a4254", borderRadius: 999 },
        },
      ],
    },
  },
};

export const jsonExample = JSON.stringify(jsonValue, null, 2);

export const flutterExample = [
  "// Nexus widget runtime — Dart widget trees, interpreted live.",
  "// Closures are ignored. Use nexus.inc, nexus.nav, nexus.set, nexus.pick.",
  "int steps = 2480;",
  "",
  "NexusApp(",
  "  start: 'today',",
  "  today: Scaffold(",
  "    backgroundColor: Color(0xFF10141C),",
  "    appBar: AppBar(",
  "      title: Text('Northwind', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white)),",
  "      backgroundColor: Color(0xFF10141C),",
  "    ),",
  "    body: SingleChildScrollView(",
  "      child: Padding(",
  "        padding: EdgeInsets.all(20),",
  "        child: Column(",
  "          crossAxisAlignment: CrossAxisAlignment.stretch,",
  "          children: [",
  "            Text('Morning, Ada', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: Colors.white)),",
  "            SizedBox(height: 6),",
  "            Text('A quiet log. No cloud, no compile step.', style: TextStyle(fontSize: 14, color: Color(0xFF9AA3B2))),",
  "            SizedBox(height: 20),",
  "            Container(",
  "              padding: EdgeInsets.all(16),",
  "              decoration: BoxDecoration(",
  "                color: Color(0xFF1C222C),",
  "                borderRadius: BorderRadius.circular(22),",
  "              ),",
  "              child: Column(",
  "                crossAxisAlignment: CrossAxisAlignment.start,",
  "                children: [",
  "                  Text('STEPS', style: TextStyle(fontSize: 12, color: Color(0xFF9AA3B2), letterSpacing: 1.4)),",
  "                  SizedBox(height: 4),",
  "                  Text('$steps', style: TextStyle(fontSize: 42, fontWeight: FontWeight.w700, color: Colors.white)),",
  "                  SizedBox(height: 8),",
  "                  When(",
  "                    test: 'steps > 4000',",
  "                    child: Text('Above your usual line.', style: TextStyle(color: Color(0xFFFF6A3D))),",
  "                    elseChild: Text('Still under the weekday mark.', style: TextStyle(color: Color(0xFF9AA3B2))),",
  "                  ),",
  "                ],",
  "              ),",
  "            ),",
  "            SizedBox(height: 16),",
  "            Row(",
  "              children: [",
  "                Expanded(child: Container(",
  "                  padding: EdgeInsets.all(14),",
  "                  decoration: BoxDecoration(color: Color(0xFF1C222C), borderRadius: BorderRadius.circular(16)),",
  "                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [",
  "                    Icon(Icons.timer, color: Color(0xFF9AA3B2)),",
  "                    SizedBox(height: 8),",
  "                    Text('41 min', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),",
  "                  ]),",
  "                )),",
  "                SizedBox(width: 10),",
  "                Expanded(child: Container(",
  "                  padding: EdgeInsets.all(14),",
  "                  decoration: BoxDecoration(color: Color(0xFF1C222C), borderRadius: BorderRadius.circular(16)),",
  "                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [",
  "                    Icon(Icons.local_fire_department, color: Color(0xFFFF6A3D)),",
  "                    SizedBox(height: 8),",
  "                    Text('Easy', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),",
  "                  ]),",
  "                )),",
  "              ],",
  "            ),",
  "            SizedBox(height: 18),",
  "            Text('The path stays on the ridge until the trees close in.', style: TextStyle(color: Color(0xFFC9C3B6), fontSize: 16)),",
  "          ],",
  "        ),",
  "      ),",
  "    ),",
  "    floatingActionButton: ElevatedButton(",
  "      onPressed: nexus.inc('steps', 320),",
  "      child: Icon(Icons.add),",
  "    ),",
  "    bottomNavigationBar: BottomNavigationBar(",
  "      onTap: nexus.pick('screen', 'today', 'week'),",
  "      items: [",
  "        BottomNavigationBarItem(icon: Icon(Icons.wb_sunny), label: 'Today'),",
  "        BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Week'),",
  "      ],",
  "    ),",
  "  ),",
  "  week: Scaffold(",
  "    backgroundColor: Color(0xFF10141C),",
  "    appBar: AppBar(",
  "      title: Text('This week', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),",
  "      backgroundColor: Color(0xFF10141C),",
  "    ),",
  "    body: Padding(",
  "      padding: EdgeInsets.all(20),",
  "      child: Column(",
  "        crossAxisAlignment: CrossAxisAlignment.stretch,",
  "        children: [",
  "          Text('Seven quiet miles.', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w600)),",
  "          SizedBox(height: 8),",
  "          Text('Steps logged  $steps', style: TextStyle(color: Color(0xFF9AA3B2))),",
  "          SizedBox(height: 22),",
  "          Bars(values: [18, 32, 22, 48, 28, 36, 24], color: Color(0xFFFF6A3D)),",
  "          SizedBox(height: 18),",
  "          Text('Bars are a Nexus widget. The rest is ordinary Flutter-shaped Dart.', style: TextStyle(color: Color(0xFF9AA3B2), fontSize: 14)),",
  "        ],",
  "      ),",
  "    ),",
  "    bottomNavigationBar: BottomNavigationBar(",
  "      onTap: nexus.pick('screen', 'today', 'week'),",
  "      items: [",
  "        BottomNavigationBarItem(icon: Icon(Icons.wb_sunny), label: 'Today'),",
  "        BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Week'),",
  "      ],",
  "    ),",
  "  ),",
  ")",
].join("\n");
