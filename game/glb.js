/* ===== Samsara · a small reader for binary glTF (.glb), from build 27 =====
   Reads what a character needs: meshes (with their skin), bones, base colour and textures, and animations. Node names
   are made safe for animation tracks (Mixamo's "mixamorig:Hips" becomes "mixamorig_Hips"), the way three.js does. */
function makeGLB(THREE) {
  const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const ARR = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };
  const safe = s => String(s || '').replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, '_');
  async function parse(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a .glb file');
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), start = off + 8;
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len))); else if (type === 0x004E4942) bin = buf.slice(start, start + len);
      off = start + len; }
    if (!json) throw new Error('the .glb file has no description');
    const views = json.bufferViews || [], accs = json.accessors || [];
    const acc = (i, normalized) => {   // an accessor as a flat typed array (de-interleaved, normalized if asked)
      const a = accs[i], n = SIZE[a.type], T = ARR[a.componentType], count = a.count;
      if (a.bufferView === undefined) return { array: new Float32Array(count * n), itemSize: n };
      const v = views[a.bufferView], stride = v.byteStride || 0, bo = (v.byteOffset || 0) + (a.byteOffset || 0), es = T.BYTES_PER_ELEMENT;
      let out;
      if (!stride || stride === n * es) out = new T(bin, bo, count * n).slice();
      else { out = new T(count * n); const src = new DataView(bin); const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
        for (let k = 0; k < count; k++) for (let c = 0; c < n; c++) out[k * n + c] = src[get](bo + k * stride + c * es, true); }
      if ((normalized || a.normalized) && NORM[a.componentType]) { const f = new Float32Array(out.length); for (let k = 0; k < out.length; k++) f[k] = Math.max(out[k] / NORM[a.componentType], -1); out = f; }
      return { array: out, itemSize: n };
    };
    // textures
    const imgs = await Promise.all((json.images || []).map(async im => {
      try { if (im.bufferView === undefined) return null; const v = views[im.bufferView]; const blob = new Blob([new Uint8Array(bin, v.byteOffset || 0, v.byteLength)], { type: im.mimeType || 'image/png' });
        return await createImageBitmap(blob, { imageOrientation: 'none' }); } catch (e) { return null; } }));
    const tex = (json.textures || []).map(t => { const im = imgs[t.source]; if (!im) return null; const x = new THREE.Texture(im); x.flipY = false; x.colorSpace = THREE.NoColorSpace; x.needsUpdate = true; x.wrapS = x.wrapT = THREE.RepeatWrapping; return x; });
    const mats = (json.materials || []).map(m => { const p = m.pbrMetallicRoughness || {}; return { color: p.baseColorFactor || [1, 1, 1, 1], map: p.baseColorTexture ? tex[p.baseColorTexture.index] : null, alpha: m.alphaMode || 'OPAQUE', double: !!m.doubleSided, name: m.name }; });
    // nodes: joints become bones
    const jointSet = new Set(); for (const s of json.skins || []) for (const j of s.joints) jointSet.add(j);
    const nodes = (json.nodes || []).map((n, i) => { const o = jointSet.has(i) ? new THREE.Bone() : new THREE.Object3D(); o.name = safe(n.name || `node_${i}`);
      if (n.matrix) { const m = new THREE.Matrix4().fromArray(n.matrix); m.decompose(o.position, o.quaternion, o.scale); }
      else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
      return o; });
    const used = new Set(); for (const o of nodes) { let nm = o.name, k = 1; while (used.has(nm)) nm = `${o.name}_${k++}`; o.name = nm; used.add(nm); }
    (json.nodes || []).forEach((n, i) => { for (const c of n.children || []) nodes[i].add(nodes[c]); });
    const skinned = [];
    (json.nodes || []).forEach((n, i) => {
      if (n.mesh === undefined) return;
      for (const pr of json.meshes[n.mesh].primitives) {
        if (pr.mode !== undefined && pr.mode !== 4) continue;   // triangles only
        const g = new THREE.BufferGeometry(), at = pr.attributes;
        const put = (name, key, norm) => { if (at[key] === undefined) return; const a = acc(at[key], norm); g.setAttribute(name, new THREE.BufferAttribute(a.array, a.itemSize)); };
        put('position', 'POSITION'); put('normal', 'NORMAL'); put('uv', 'TEXCOORD_0'); put('skinIndex', 'JOINTS_0'); put('skinWeight', 'WEIGHTS_0', true); put('color', 'COLOR_0', true);
        if (pr.indices !== undefined) { const a = acc(pr.indices); g.setIndex(new THREE.BufferAttribute(a.array instanceof Uint8Array ? new Uint16Array(a.array) : a.array, 1)); }
        if (!g.attributes.normal) g.computeVertexNormals();
        const m = mats[pr.material] || { color: [0.8, 0.8, 0.8, 1], map: null, alpha: 'OPAQUE', double: false };
        const skin = n.skin !== undefined;
        const mesh = skin ? new THREE.SkinnedMesh(g) : new THREE.Mesh(g); mesh.userData.mat = m; mesh.name = nodes[i].name + '_mesh'; mesh.frustumCulled = false;
        if (skin) { const s = json.skins[n.skin], ibm = s.inverseBindMatrices !== undefined ? acc(s.inverseBindMatrices).array : null;
          const bones = s.joints.map(j => nodes[j]), inv = s.joints.map((_, k) => ibm ? new THREE.Matrix4().fromArray(ibm, k * 16) : new THREE.Matrix4());
          mesh.userData.skeleton = new THREE.Skeleton(bones, inv); skinned.push(mesh); }
        nodes[i].add(mesh);
      }
    });
    const scene = new THREE.Group(); scene.name = 'glb';
    const roots = (json.scenes && json.scenes[json.scene || 0] ? json.scenes[json.scene || 0].nodes : nodes.map((_, i) => i).filter(i => !nodes[i].parent));
    for (const r of roots) scene.add(nodes[r]);
    scene.updateMatrixWorld(true);
    for (const m of skinned) m.bind(m.userData.skeleton, m.matrixWorld);
    // animations
    const clips = (json.animations || []).map((an, ai) => {
      const tracks = [];
      for (const ch of an.channels) { const tg = ch.target; if (tg.node === undefined) continue; const smp = an.samplers[ch.sampler], name = nodes[tg.node].name;
        const t = acc(smp.input).array, v0 = acc(smp.output, true).array; let v = v0;
        const n = { translation: 3, rotation: 4, scale: 3 }[tg.path]; if (!n) continue;
        if (smp.interpolation === 'CUBICSPLINE') { v = new Float32Array(t.length * n); for (let k = 0; k < t.length; k++) for (let c = 0; c < n; c++) v[k * n + c] = v0[k * n * 3 + n + c]; }
        const T = tg.path === 'rotation' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
        const track = new T(`${name}.${{ translation: 'position', rotation: 'quaternion', scale: 'scale' }[tg.path]}`, Array.from(t), Array.from(v));
        if (smp.interpolation === 'STEP') track.setInterpolation(THREE.InterpolateDiscrete);
        tracks.push(track); }
      return new THREE.AnimationClip(an.name || `clip_${ai}`, -1, tracks);
    });
    return { scene, clips, skinned, meshes: (() => { const a = []; scene.traverse(o => { if (o.isMesh) a.push(o); }); return a; })() };
  }
  return { parse };
}
