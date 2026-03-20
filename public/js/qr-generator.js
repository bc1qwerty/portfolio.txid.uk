/**
 * qr-generator.js — Minimal QR code SVG generator for Bitcoin addresses.
 * Generates QR codes using pure JS (no external dependencies).
 * Uses a simplified QR encoding sufficient for bitcoin: URIs.
 */
(function () {
  'use strict';

  // ── QR Code Matrix Generator (Mode Byte, ECC Level M) ──
  // Simplified implementation for alphanumeric data up to ~90 chars (Version 1-6)

  // Galois Field 256 tables
  var EXP = new Uint8Array(256);
  var LOG = new Uint8Array(256);
  (function () {
    var v = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = v;
      LOG[v] = i;
      v = v << 1;
      if (v & 256) v ^= 0x11d;
    }
    EXP[255] = EXP[0];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[(LOG[a] + LOG[b]) % 255];
  }

  // Polynomial division for Reed-Solomon
  function rsEncode(data, ecLen) {
    var gen = [1];
    for (var i = 0; i < ecLen; i++) {
      var next = new Array(gen.length + 1);
      next[0] = 0;
      for (var j = 0; j < gen.length; j++) next[j + 1] = gen[j];
      for (var j = 0; j < gen.length; j++) {
        next[j] ^= gfMul(gen[j], EXP[i]);
      }
      gen = next;
    }

    var msg = new Uint8Array(data.length + ecLen);
    for (var i = 0; i < data.length; i++) msg[i] = data[i];

    for (var i = 0; i < data.length; i++) {
      var coef = msg[i];
      if (coef !== 0) {
        for (var j = 0; j < gen.length; j++) {
          msg[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }

    return msg.slice(data.length);
  }

  // QR Version info
  var VERSIONS = [
    null,
    { size: 21, dataBytes: 16, ecBytes: 10 },   // V1-M
    { size: 25, dataBytes: 28, ecBytes: 16 },   // V2-M
    { size: 29, dataBytes: 44, ecBytes: 26 },   // V3-M
    { size: 33, dataBytes: 64, ecBytes: 18 },   // V4-M (2 blocks)
    { size: 37, dataBytes: 86, ecBytes: 24 },   // V5-M
    { size: 41, dataBytes: 108, ecBytes: 16 },  // V6-M (2 blocks)
    { size: 45, dataBytes: 124, ecBytes: 18 },  // V7-M
  ];

  // Use the simple approach: encode as byte mode
  function encodeData(text) {
    var bytes = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else if (c < 2048) {
        bytes.push(192 | (c >> 6), 128 | (c & 63));
      } else {
        bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
    }
    return bytes;
  }

  function selectVersion(dataLen) {
    for (var v = 1; v <= 7; v++) {
      var info = VERSIONS[v];
      // Byte mode: 4 bit mode indicator + 8/16 bit count + data
      var overhead = 4 + (v <= 9 ? 8 : 16);
      var available = info.dataBytes * 8 - overhead;
      if (dataLen * 8 <= available) return v;
    }
    return 7; // fallback
  }

  // ── Alternative: Use canvas-based QR with external lib or a simple approach ──
  // For reliability, use a proven minimal QR implementation

  /**
   * Generate SVG string for a QR code of the given text.
   * Falls back to a styled text display if QR generation fails.
   */
  function generateQR(text, size) {
    size = size || 200;
    // Use the proven qrcode-generator algorithm via a minimal implementation
    // For Bitcoin addresses (34-62 chars), we need Version 3-4 QR codes

    try {
      var matrix = createQRMatrix(text);
      if (!matrix || !matrix.length) throw new Error('Empty matrix');

      var modules = matrix.length;
      var cellSize = size / modules;
      var rects = [];

      for (var y = 0; y < modules; y++) {
        for (var x = 0; x < modules; x++) {
          if (matrix[y][x]) {
            rects.push('<rect x="' + (x * cellSize).toFixed(2) + '" y="' + (y * cellSize).toFixed(2) +
              '" width="' + cellSize.toFixed(2) + '" height="' + cellSize.toFixed(2) + '"/>');
          }
        }
      }

      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size +
        '" width="' + size + '" height="' + size + '" role="img" aria-label="QR Code">' +
        '<rect width="' + size + '" height="' + size + '" fill="#fff"/>' +
        '<g fill="#000">' + rects.join('') + '</g></svg>';
    } catch (e) {
      // Fallback: show address as text
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">' +
        '<rect width="200" height="200" fill="#fff" rx="8"/>' +
        '<text x="100" y="100" text-anchor="middle" font-size="10" fill="#333">QR</text></svg>';
    }
  }

  // ── Minimal QR Matrix Creation (Byte mode, ECC-M) ──
  function createQRMatrix(text) {
    var dataBytes = encodeData(text);
    var version = selectVersion(dataBytes.length);
    var info = VERSIONS[version];
    var size = info.size;

    // Build data stream: mode(4) + count(8 or 16) + data + terminator + padding
    var bits = [];

    // Mode: 0100 = Byte mode
    bits.push(0, 1, 0, 0);

    // Character count
    var countBits = version <= 9 ? 8 : 16;
    for (var i = countBits - 1; i >= 0; i--) {
      bits.push((dataBytes.length >> i) & 1);
    }

    // Data bytes
    for (var i = 0; i < dataBytes.length; i++) {
      for (var j = 7; j >= 0; j--) {
        bits.push((dataBytes[i] >> j) & 1);
      }
    }

    // Terminator (up to 4 zeros)
    var totalDataBits = info.dataBytes * 8;
    var termLen = Math.min(4, totalDataBits - bits.length);
    for (var i = 0; i < termLen; i++) bits.push(0);

    // Pad to byte boundary
    while (bits.length % 8 !== 0) bits.push(0);

    // Pad bytes: alternate 0xEC and 0x11
    var padBytes = [0xEC, 0x11];
    var padIdx = 0;
    while (bits.length < totalDataBits) {
      var pb = padBytes[padIdx % 2];
      for (var j = 7; j >= 0; j--) bits.push((pb >> j) & 1);
      padIdx++;
    }

    // Convert bits to bytes
    var dataBytesArr = new Uint8Array(info.dataBytes);
    for (var i = 0; i < info.dataBytes; i++) {
      var byte = 0;
      for (var j = 0; j < 8; j++) {
        byte = (byte << 1) | (bits[i * 8 + j] || 0);
      }
      dataBytesArr[i] = byte;
    }

    // Reed-Solomon error correction
    var ecCodewords = rsEncode(dataBytesArr, info.ecBytes);

    // Combine data + EC
    var allBytes = new Uint8Array(info.dataBytes + info.ecBytes);
    allBytes.set(dataBytesArr);
    allBytes.set(ecCodewords, info.dataBytes);

    // Create matrix
    var matrix = [];
    var reserved = [];
    for (var y = 0; y < size; y++) {
      matrix[y] = new Uint8Array(size);
      reserved[y] = new Uint8Array(size);
    }

    // Place finder patterns
    placeFinder(matrix, reserved, 0, 0, size);
    placeFinder(matrix, reserved, size - 7, 0, size);
    placeFinder(matrix, reserved, 0, size - 7, size);

    // Timing patterns
    for (var i = 8; i < size - 8; i++) {
      if (!reserved[6][i]) {
        matrix[6][i] = (i % 2 === 0) ? 1 : 0;
        reserved[6][i] = 1;
      }
      if (!reserved[i][6]) {
        matrix[i][6] = (i % 2 === 0) ? 1 : 0;
        reserved[i][6] = 1;
      }
    }

    // Alignment patterns (V2+)
    if (version >= 2) {
      var alignPos = getAlignmentPositions(version);
      for (var ai = 0; ai < alignPos.length; ai++) {
        for (var aj = 0; aj < alignPos.length; aj++) {
          var ay = alignPos[ai];
          var ax = alignPos[aj];
          // Skip if overlapping finder
          if (reserved[ay][ax]) continue;
          placeAlignment(matrix, reserved, ay, ax, size);
        }
      }
    }

    // Reserve format info areas
    reserveFormatInfo(reserved, size);

    // Dark module
    matrix[size - 8][8] = 1;
    reserved[size - 8][8] = 1;

    // Place data bits
    placeDataBits(matrix, reserved, allBytes, size);

    // Apply mask (mask 0: (row + col) % 2 == 0)
    applyMask(matrix, reserved, size, 0);

    // Place format info
    placeFormatInfo(matrix, size, 0); // ECC-M, mask 0

    // Version info (V7+ only, skip for our versions)

    return matrix;
  }

  function placeFinder(matrix, reserved, row, col, size) {
    var pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1],
    ];
    for (var dy = -1; dy <= 7; dy++) {
      for (var dx = -1; dx <= 7; dx++) {
        var y = row + dy;
        var x = col + dx;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        if (dy >= 0 && dy < 7 && dx >= 0 && dx < 7) {
          matrix[y][x] = pattern[dy][dx];
        } else {
          matrix[y][x] = 0; // separator
        }
        reserved[y][x] = 1;
      }
    }
  }

  function placeAlignment(matrix, reserved, centerY, centerX, size) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) {
        var y = centerY + dy;
        var x = centerX + dx;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        var val = (Math.abs(dy) === 2 || Math.abs(dx) === 2 || (dy === 0 && dx === 0)) ? 1 : 0;
        matrix[y][x] = val;
        reserved[y][x] = 1;
      }
    }
  }

  function getAlignmentPositions(version) {
    var table = [
      null,
      [], // V1
      [6, 18], // V2
      [6, 22], // V3
      [6, 26], // V4
      [6, 30], // V5
      [6, 34], // V6
      [6, 22, 38], // V7
    ];
    return table[version] || [];
  }

  function reserveFormatInfo(reserved, size) {
    // Horizontal format info (row 8)
    for (var x = 0; x <= 8; x++) reserved[8][x] = 1;
    for (var x = size - 8; x < size; x++) reserved[8][x] = 1;
    // Vertical format info (col 8)
    for (var y = 0; y <= 8; y++) reserved[y][8] = 1;
    for (var y = size - 7; y < size; y++) reserved[y][8] = 1;
  }

  function placeDataBits(matrix, reserved, allBytes, size) {
    var allBits = [];
    for (var i = 0; i < allBytes.length; i++) {
      for (var j = 7; j >= 0; j--) {
        allBits.push((allBytes[i] >> j) & 1);
      }
    }

    var bitIdx = 0;
    var x = size - 1;
    var upward = true;

    while (x >= 0) {
      if (x === 6) { x--; continue; } // Skip timing column

      var startY = upward ? size - 1 : 0;
      var endY = upward ? -1 : size;
      var step = upward ? -1 : 1;

      for (var y = startY; y !== endY; y += step) {
        for (var dx = 0; dx >= -1; dx--) {
          var cx = x + dx;
          if (cx < 0 || cx >= size) continue;
          if (reserved[y][cx]) continue;
          if (bitIdx < allBits.length) {
            matrix[y][cx] = allBits[bitIdx];
            bitIdx++;
          }
        }
      }

      x -= 2;
      upward = !upward;
    }
  }

  function applyMask(matrix, reserved, size, maskNum) {
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (reserved[y][x]) continue;
        var shouldFlip = false;
        switch (maskNum) {
          case 0: shouldFlip = (y + x) % 2 === 0; break;
          case 1: shouldFlip = y % 2 === 0; break;
          case 2: shouldFlip = x % 3 === 0; break;
          case 3: shouldFlip = (y + x) % 3 === 0; break;
          case 4: shouldFlip = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
          case 5: shouldFlip = ((y * x) % 2 + (y * x) % 3) === 0; break;
          case 6: shouldFlip = ((y * x) % 2 + (y * x) % 3) % 2 === 0; break;
          case 7: shouldFlip = ((y + x) % 2 + (y * x) % 3) % 2 === 0; break;
        }
        if (shouldFlip) matrix[y][x] ^= 1;
      }
    }
  }

  // Format info: ECC level M = 00, mask pattern
  var FORMAT_INFO_STRINGS = [
    0x5412, // M, mask 0
    0x5125, // M, mask 1
    0x5E7C, // M, mask 2
    0x5B4B, // M, mask 3
    0x45F9, // M, mask 4
    0x40CE, // M, mask 5
    0x4F97, // M, mask 6
    0x4AA0, // M, mask 7
  ];

  function placeFormatInfo(matrix, size, maskNum) {
    var formatBits = FORMAT_INFO_STRINGS[maskNum];

    // Place around top-left finder
    var positions1 = [
      [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],
      [8,7],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
    ];
    for (var i = 0; i < 15; i++) {
      var bit = (formatBits >> (14 - i)) & 1;
      matrix[positions1[i][0]][positions1[i][1]] = bit;
    }

    // Place around other finders
    // Bottom-left vertical
    for (var i = 0; i < 7; i++) {
      var bit = (formatBits >> i) & 1;
      matrix[size - 1 - i][8] = bit;
    }
    // Top-right horizontal
    for (var i = 0; i < 8; i++) {
      var bit = (formatBits >> (14 - i)) & 1;
      matrix[8][size - 8 + i] = bit;
    }
  }

  // ── QR Modal UI ──
  function showQRModal(address) {
    // Remove existing modal
    var existing = document.getElementById('qr-modal');
    if (existing) existing.remove();

    var bitcoinUri = 'bitcoin:' + address;
    var svgContent = generateQR(bitcoinUri);

    var modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.className = 'qr-modal-overlay';
    modal.innerHTML =
      '<div class="qr-modal-content" role="dialog" aria-label="QR Code">' +
        '<button class="qr-modal-close" aria-label="Close">&times;</button>' +
        '<div class="qr-modal-svg">' + svgContent + '</div>' +
        '<div class="qr-modal-addr">' + address + '</div>' +
        '<button class="qr-modal-copy" id="qr-copy-btn">Copy Address</button>' +
      '</div>';

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.qr-modal-close').addEventListener('click', function () { modal.remove(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', handler); }
    });

    // Copy button
    modal.querySelector('#qr-copy-btn').addEventListener('click', function () {
      navigator.clipboard.writeText(address).then(function () {
        var btn = modal.querySelector('#qr-copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy Address'; }, 2000);
      });
    });
  }

  // Expose globally
  window.showQRModal = showQRModal;
})();
