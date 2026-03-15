// Pen-to-Figma Importer Plugin — v3 (with image support)

function b64ToBytes(b64) {
  var bin = "";
  var lookup = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var pad = b64.indexOf("=");
  var len = pad > 0 ? pad : b64.length;
  for (var i = 0; i < len; i += 4) {
    var a = lookup.indexOf(b64[i]);
    var b = i+1 < len ? lookup.indexOf(b64[i+1]) : 0;
    var c = i+2 < len ? lookup.indexOf(b64[i+2]) : 0;
    var d = i+3 < len ? lookup.indexOf(b64[i+3]) : 0;
    bin += String.fromCharCode((a<<2)|(b>>4));
    if (i+2 < len && b64[i+2] !== "=") bin += String.fromCharCode(((b&15)<<4)|(c>>2));
    if (i+3 < len && b64[i+3] !== "=") bin += String.fromCharCode(((c&3)<<6)|d);
  }
  var bytes = new Uint8Array(bin.length);
  for (var j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
  return bytes;
}

async function applyImageFill(node, fill) {
  if (!fill || fill.type !== "image" || !fill.imageKey) return false;
  var b64 = IMAGE_MAP[fill.imageKey];
  if (!b64) return false;
  try {
    var bytes = b64ToBytes(b64);
    var img = figma.createImage(bytes);
    var mode = fill.mode === "stretch" ? "STRETCH" : "FILL";
    node.fills = [{type: "IMAGE", imageHash: img.hash, scaleMode: mode}];
    return true;
  } catch(e) {
    console.log("Image fill error: " + e.message);
    return false;
  }
}

function parseHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r, g, b, a = 1;
  if (hex.length === 8) {
    r = parseInt(hex.slice(0,2),16)/255;
    g = parseInt(hex.slice(2,4),16)/255;
    b = parseInt(hex.slice(4,6),16)/255;
    a = parseInt(hex.slice(6,8),16)/255;
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0,2),16)/255;
    g = parseInt(hex.slice(2,4),16)/255;
    b = parseInt(hex.slice(4,6),16)/255;
  } else return null;
  return { color: { r:r, g:g, b:b }, opacity: a };
}

function makePaint(f) {
  if (typeof f === "string") {
    var p = parseHex(f);
    return p ? { type:"SOLID", color:p.color, opacity:p.opacity } : null;
  }
  if (f && typeof f === "object" && f.type === "color") return makePaint(f.color);
  return null;
}

function makePaints(fills) {
  if (!fills) return [];
  var arr = Array.isArray(fills) ? fills : [fills];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var f = arr[i];
    if (typeof f === "object" && f.type && f.type !== "color") continue;
    var p = makePaint(f);
    if (p) out.push(p);
  }
  return out;
}

function weightToStyle(w) {
  if (w === "normal" || w === "regular" || !w) return "Regular";
  var n = typeof w === "string" ? parseInt(w) : w;
  if (isNaN(n) || n <= 0) return "Regular";
  if (n <= 100) return "Thin";
  if (n <= 200) return "ExtraLight";
  if (n <= 300) return "Light";
  if (n <= 400) return "Regular";
  if (n <= 500) return "Medium";
  if (n <= 600) return "SemiBold";
  if (n <= 700) return "Bold";
  if (n <= 800) return "ExtraBold";
  return "Black";
}

var _fonts = {};
async function loadFont(fam, sty) {
  var k = fam+"||"+sty;
  if (_fonts[k] !== undefined) return _fonts[k];
  try {
    await figma.loadFontAsync({family:fam, style:sty});
    _fonts[k] = true;
    return true;
  } catch(e) {
    _fonts[k] = false;
    // try Regular
    var k2 = fam+"||Regular";
    if (_fonts[k2] === undefined) {
      try { await figma.loadFontAsync({family:fam, style:"Regular"}); _fonts[k2]=true; } catch(e2) { _fonts[k2]=false; }
    }
    // ensure Inter Regular
    var k3 = "Inter||Regular";
    if (_fonts[k3] === undefined) {
      try { await figma.loadFontAsync({family:"Inter", style:"Regular"}); _fonts[k3]=true; } catch(e3) { _fonts[k3]=false; }
    }
    return false;
  }
}

function getFontName(fam, weight) {
  var sty = weightToStyle(weight);
  var k = fam+"||"+sty;
  if (_fonts[k]) return {family:fam, style:sty};
  var k2 = fam+"||Regular";
  if (_fonts[k2]) return {family:fam, style:"Regular"};
  return {family:"Inter", style:"Regular"};
}

function setCornerRadius(node, cr) {
  if (cr == null) return;
  try {
    if (typeof cr === "number") {
      node.cornerRadius = cr;
    } else if (Array.isArray(cr)) {
      node.topLeftRadius = cr[0]||0;
      node.topRightRadius = cr[1]||0;
      node.bottomRightRadius = cr[2]||0;
      node.bottomLeftRadius = cr[3]||0;
    }
  } catch(e) {}
}

function setStroke(node, s) {
  if (!s) return;
  try {
    var p = makePaints(s.fill);
    if (p.length > 0) node.strokes = p;
    if (s.thickness != null) {
      if (typeof s.thickness === "number") {
        node.strokeWeight = s.thickness;
      } else if (typeof s.thickness === "object") {
        try {
          node.strokeTopWeight = s.thickness.top||0;
          node.strokeRightWeight = s.thickness.right||0;
          node.strokeBottomWeight = s.thickness.bottom||0;
          node.strokeLeftWeight = s.thickness.left||0;
        } catch(e) {
          node.strokeWeight = s.thickness.top||s.thickness.bottom||s.thickness.left||s.thickness.right||1;
        }
      }
    }
  } catch(e) {}
}

function setPadding(node, pad) {
  if (pad == null) return;
  try {
    if (typeof pad === "number") {
      node.paddingTop = pad; node.paddingRight = pad;
      node.paddingBottom = pad; node.paddingLeft = pad;
    } else if (Array.isArray(pad)) {
      if (pad.length === 2) {
        node.paddingTop = pad[0]; node.paddingBottom = pad[0];
        node.paddingLeft = pad[1]; node.paddingRight = pad[1];
      } else if (pad.length === 4) {
        node.paddingTop = pad[0]; node.paddingRight = pad[1];
        node.paddingBottom = pad[2]; node.paddingLeft = pad[3];
      }
    }
  } catch(e) {}
}

// parentLayout: "VERTICAL", "HORIZONTAL", or "NONE"/undefined
function applySizingAfterAppend(node, pen, parentLayout) {
  if (!parentLayout || parentLayout === "NONE") return;
  try {
    var wFill = pen.width === "fill_container";
    var hFill = pen.height === "fill_container";

    // In Figma auto-layout:
    // VERTICAL parent: counter-axis=width, primary-axis=height
    //   layoutAlign="STRETCH" stretches width (counter)
    //   layoutGrow=1 stretches height (primary)
    // HORIZONTAL parent: counter-axis=height, primary-axis=width
    //   layoutAlign="STRETCH" stretches height (counter)
    //   layoutGrow=1 stretches width (primary)

    if (parentLayout === "VERTICAL") {
      if (wFill) node.layoutAlign = "STRETCH";
      if (hFill) node.layoutGrow = 1;
    } else if (parentLayout === "HORIZONTAL") {
      if (wFill) node.layoutGrow = 1;
      if (hFill) node.layoutAlign = "STRETCH";
    }
  } catch(e) {
    console.log("sizing err: " + e.message);
  }
}

function getParentLayout(parent) {
  if (!parent) return null;
  try { return parent.layoutMode || null; } catch(e) { return null; }
}

async function build(pen, parent) {
  if (!pen || !pen.type) return null;
  var node = null;
  var parentLayout = getParentLayout(parent);

  try {
    if (pen.type === "frame" || pen.type === "group") {
      node = figma.createFrame();
      node.name = pen.name || pen.id || "Frame";

      // Fills
      if (pen.type === "group") {
        node.fills = [];
      } else if (pen.fill && pen.fill.type === "image") {
        await applyImageFill(node, pen.fill);
      } else {
        var p = makePaints(pen.fill);
        node.fills = p.length > 0 ? p : [];
      }

      setCornerRadius(node, pen.cornerRadius);
      node.clipsContent = !!pen.clip;
      setStroke(node, pen.stroke);

      // Infer auto-layout: if gap/alignItems/justifyContent/padding exist but no explicit layout,
      // default to horizontal (the .pen format convention).
      var explicitLayout = pen.layout;
      if (!explicitLayout && explicitLayout !== "none") {
        if (pen.gap != null || pen.alignItems || pen.justifyContent || pen.padding != null) {
          explicitLayout = "horizontal";
        }
      }
      var hasLayout = explicitLayout === "vertical" || explicitLayout === "horizontal";
      if (hasLayout) {
        node.layoutMode = explicitLayout === "vertical" ? "VERTICAL" : "HORIZONTAL";
        if (typeof pen.gap === "number") node.itemSpacing = pen.gap;
        setPadding(node, pen.padding);

        var jcMap = {start:"MIN",center:"CENTER",end:"MAX",space_between:"SPACE_BETWEEN",space_around:"SPACE_BETWEEN"};
        var aiMap = {start:"MIN",center:"CENTER",end:"MAX"};
        if (pen.justifyContent) node.primaryAxisAlignItems = jcMap[pen.justifyContent]||"MIN";
        if (pen.alignItems) node.counterAxisAlignItems = aiMap[pen.alignItems]||"MIN";

        // Determine sizing mode for the frame itself
        var isVert = explicitLayout === "vertical";

        // Width sizing
        var wFixed = typeof pen.width === "number";
        var wFill = pen.width === "fill_container";
        var wHug = !pen.width || (typeof pen.width === "string" && pen.width.indexOf("fit_content") >= 0);

        // Height sizing
        var hFixed = typeof pen.height === "number";
        var hFill = pen.height === "fill_container";
        var hHug = !pen.height || (typeof pen.height === "string" && pen.height.indexOf("fit_content") >= 0);

        if (isVert) {
          // primary = height, counter = width
          // fill_container = size determined by parent, so treat as FIXED (not hug)
          node.primaryAxisSizingMode = ((hFixed || hFill) ? "FIXED" : "AUTO");
          node.counterAxisSizingMode = ((wFixed || wFill) ? "FIXED" : "AUTO");
        } else {
          // primary = width, counter = height
          node.primaryAxisSizingMode = ((wFixed || wFill) ? "FIXED" : "AUTO");
          node.counterAxisSizingMode = ((hFixed || hFill) ? "FIXED" : "AUTO");
        }
      }

      // Set explicit size
      var w = typeof pen.width === "number" ? pen.width : 100;
      var h = typeof pen.height === "number" ? pen.height : 100;
      if (typeof pen.width === "number" || typeof pen.height === "number") {
        node.resize(Math.max(w, 1), Math.max(h, 1));
      }

      // Append to parent FIRST so layoutAlign/layoutGrow work
      if (parent) {
        parent.appendChild(node);
        applySizingAfterAppend(node, pen, parentLayout);
      }

      // Build children
      if (pen.children && Array.isArray(pen.children)) {
        for (var i = 0; i < pen.children.length; i++) {
          await build(pen.children[i], node);
        }
      }

    } else if (pen.type === "rectangle") {
      node = figma.createRectangle();
      node.name = pen.name || pen.id || "Rect";
      var w = typeof pen.width === "number" ? pen.width : 100;
      var h = typeof pen.height === "number" ? pen.height : 100;
      node.resize(Math.max(w, 1), Math.max(h, 1));
      var p = makePaints(pen.fill);
      node.fills = p.length > 0 ? p : [];
      setCornerRadius(node, pen.cornerRadius);
      setStroke(node, pen.stroke);

      if (parent) {
        parent.appendChild(node);
        applySizingAfterAppend(node, pen, parentLayout);
      }

    } else if (pen.type === "ellipse") {
      node = figma.createEllipse();
      node.name = pen.name || pen.id || "Ellipse";
      var w = typeof pen.width === "number" ? pen.width : 50;
      var h = typeof pen.height === "number" ? pen.height : 50;
      node.resize(Math.max(w, 1), Math.max(h, 1));
      var p = makePaints(pen.fill);
      node.fills = p.length > 0 ? p : [];
      setStroke(node, pen.stroke);

      if (parent) {
        parent.appendChild(node);
        applySizingAfterAppend(node, pen, parentLayout);
      }

    } else if (pen.type === "text") {
      node = figma.createText();
      node.name = pen.name || pen.id || "Text";

      var fam = pen.fontFamily || "Inter";
      var wt = pen.fontWeight || "400";
      var sty = weightToStyle(wt);
      await loadFont(fam, sty);
      node.fontName = getFontName(fam, wt);

      var txt = typeof pen.content === "string" ? pen.content : "";
      node.characters = txt;

      if (pen.fontSize) node.fontSize = pen.fontSize;
      if (pen.letterSpacing) node.letterSpacing = {value:pen.letterSpacing, unit:"PIXELS"};
      if (pen.lineHeight && typeof pen.lineHeight === "number") {
        node.lineHeight = {value: pen.lineHeight * (pen.fontSize||14), unit:"PIXELS"};
      }

      var taMap = {left:"LEFT",center:"CENTER",right:"RIGHT",justify:"JUSTIFIED"};
      if (pen.textAlign) node.textAlignHorizontal = taMap[pen.textAlign]||"LEFT";

      // Text sizing: must set textAutoResize BEFORE setting width
      var wIsFill = pen.width === "fill_container";
      var wIsNum = typeof pen.width === "number";

      if (pen.textGrowth === "fixed-width" || pen.textGrowth === "fixed-width-height") {
        if (pen.textGrowth === "fixed-width") {
          node.textAutoResize = "HEIGHT";
        } else {
          node.textAutoResize = "NONE";
        }
        if (wIsNum) {
          node.resize(pen.width, Math.max(node.height, 14));
        } else if (!wIsFill) {
          node.resize(200, Math.max(node.height, 14));
        }
      } else {
        node.textAutoResize = "WIDTH_AND_HEIGHT";
      }

      // Text color
      var tp = makePaints(pen.fill);
      if (tp.length > 0) node.fills = tp;

      if (parent) {
        parent.appendChild(node);

        // For text with fill_container width in auto-layout:
        if (wIsFill && parentLayout) {
          try {
            node.textAutoResize = "HEIGHT";
            if (parentLayout === "VERTICAL") {
              node.layoutAlign = "STRETCH";
            } else if (parentLayout === "HORIZONTAL") {
              node.layoutGrow = 1;
            }
          } catch(e) {}
        } else {
          applySizingAfterAppend(node, pen, parentLayout);
        }
      }

    } else if (pen.type === "path") {
      node = figma.createRectangle();
      node.name = pen.name || pen.id || "Path";
      var w = typeof pen.width === "number" ? pen.width : 28;
      var h = typeof pen.height === "number" ? pen.height : 40;
      node.resize(Math.max(w,1), Math.max(h,1));
      var p = makePaints(pen.fill);
      node.fills = p.length > 0 ? p : [{type:"SOLID",color:{r:0.1,g:0.1,b:0.1},opacity:0.3}];
      node.cornerRadius = 4;
      if (parent) { parent.appendChild(node); applySizingAfterAppend(node, pen, parentLayout); }

    } else if (pen.type === "icon_font") {
      node = figma.createText();
      node.name = pen.name || pen.id || "Icon";
      await loadFont("Inter", "Regular");
      node.fontName = {family:"Inter", style:"Regular"};
      node.characters = pen.iconFontName || "●";
      if (pen.fontSize) node.fontSize = pen.fontSize;
      var p = makePaints(pen.fill);
      if (p.length > 0) node.fills = p;
      node.textAutoResize = "WIDTH_AND_HEIGHT";
      if (parent) { parent.appendChild(node); applySizingAfterAppend(node, pen, parentLayout); }

    } else if (pen.type === "line") {
      node = figma.createRectangle();
      node.name = pen.name || "Line";
      var w = typeof pen.width === "number" ? pen.width : 100;
      node.resize(Math.max(w,1), 1);
      node.fills = [{type:"SOLID",color:{r:0.9,g:0.9,b:0.9},opacity:1}];
      if (parent) { parent.appendChild(node); applySizingAfterAppend(node, pen, parentLayout); }

    } else {
      return null;
    }
  } catch(err) {
    console.log("ERR [" + (pen.name||pen.id||pen.type) + "]: " + err.message);
    return null;
  }

  if (!node) return null;

  // Position (only meaningful outside auto-layout)
  if (!parentLayout || parentLayout === "NONE") {
    try {
      if (typeof pen.x === "number") node.x = pen.x;
      if (typeof pen.y === "number") node.y = pen.y;
    } catch(e) {}
  }

  if (typeof pen.opacity === "number") {
    try { node.opacity = pen.opacity; } catch(e) {}
  }

  return node;
}

async function main() {
  figma.notify("Importing .pen design...");

  // Pre-load common fonts
  await loadFont("Inter", "Regular");
  await loadFont("Inter", "Medium");
  await loadFont("Inter", "SemiBold");
  await loadFont("Inter", "Bold");
  await loadFont("Inter", "Light");
  await loadFont("JetBrains Mono", "Regular");
  await loadFont("JetBrains Mono", "Medium");
  await loadFont("JetBrains Mono", "SemiBold");
  await loadFont("JetBrains Mono", "Bold");
  await loadFont("Newsreader", "Regular");
  await loadFont("Newsreader", "Medium");
  await loadFont("Syne", "Regular");
  await loadFont("Syne", "Bold");

  var page = figma.currentPage;
  var created = 0;

  for (var i = 0; i < PEN_DATA.length; i++) {
    try {
      var node = await build(PEN_DATA[i], null);
      if (node) {
        page.appendChild(node);
        if (typeof PEN_DATA[i].x === "number") node.x = PEN_DATA[i].x;
        if (typeof PEN_DATA[i].y === "number") node.y = PEN_DATA[i].y;
        created++;
      }
    } catch(e) {
      console.log("Top frame " + i + " error: " + e.message);
    }
  }

  try { figma.viewport.scrollAndZoomIntoView(page.children.slice(-created)); } catch(e) {}
  figma.notify("Done! " + created + " frames imported.");
  figma.closePlugin();
}



var IMAGE_MAP = "__IMAGE_MAP_PLACEHOLDER__";
var PEN_DATA = "__PEN_DATA_PLACEHOLDER__";

main();
