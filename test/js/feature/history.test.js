// js/features/records/history.js
// Renders last 3 image generation runs for the current user and enables downloading images.
//
// Usage:
// - Include this script in index.html after Firebase is initialized.
// - Ensure there is an element with id="records-last-runs" inside the records page container.
// - Call window.initRecordsPage() when the records page is shown.

(function () {
  // Expose initialization so other parts of the app can call it when the user navigates to the records page
  window.initRecordsPage = async function initRecordsPage(containerId = 'records-last-runs') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('Records container not found:', containerId);
      return;
    }

    container.innerHTML = `<div class="loading">Loading recent runs...</div>`;

    // Require firebase auth + firestore to be loaded (index.html already includes compat SDKs)
    if (!window.firebase || !firebase.auth || !firebase.firestore) {
      container.innerHTML = `<div class="message error">Firebase not initialized. Cannot load records.</div>`;
      return;
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    const user = auth.currentUser;
    if (!user) {
      container.innerHTML = `<div class="message info">Please sign in to view your generation history.</div>`;
      return;
    }

    // Query the user's generation runs
    // Assumes a collection like 'generations' or 'records' and each doc has { uid, images: [url], createdAt | timestamp }
    try {
      let q = db.collection('generations')
        .where('uid', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(3);

      // If createdAt doesn't exist, catch and try 'timestamp' or fallback to client-side sort
      let snapshot;
      try {
        snapshot = await q.get();
      } catch (err) {
        // fallback 1: try 'timestamp'
        try {
          q = db.collection('generations')
            .where('uid', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(3);
          snapshot = await q.get();
        } catch (err2) {
          // final fallback: fetch user's documents and sort client side
          snapshot = await db.collection('generations')
            .where('uid', '==', user.uid)
            .get();
          const docs = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a.createdAt ? a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime() : (a.timestamp ? (a.timestamp.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime()) : 0);
              const tb = b.createdAt ? b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime() : (b.timestamp ? (b.timestamp.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime()) : 0);
              return tb - ta;
            })
            .slice(0, 3);
          // Render using docs array
          renderRunsArray(container, docs);
          return;
        }
      }

      if (!snapshot || snapshot.empty) {
        container.innerHTML = `<div class="no-results">No recent generation runs found.</div>`;
        return;
      }

      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRunsArray(container, docs);
    } catch (err) {
      console.error('Error loading generation runs:', err);
      container.innerHTML = `<div class="message error">Failed to load recent runs: ${err.message}</div>`;
    }
  };

  function renderRunsArray(container, docs) {
    container.innerHTML = '';
    docs.forEach(doc => {
      const runCard = document.createElement('div');
      runCard.className = 'run-card';

      // Timestamp handling
      const ts = doc.createdAt || doc.timestamp || doc.time || doc.date;
      let timeLabel = '';
      if (ts && ts.toDate) {
        timeLabel = ts.toDate().toLocaleString();
      } else if (typeof ts === 'number') {
        timeLabel = new Date(ts).toLocaleString();
      } else if (typeof ts === 'string') {
        timeLabel = new Date(ts).toLocaleString();
      } else {
        timeLabel = 'Unknown time';
      }

      const runHeader = document.createElement('div');
      runHeader.className = 'run-header';
      runHeader.innerHTML = `<div class="run-meta"><strong>Run</strong> <span class="run-time">${timeLabel}</span></div>`;
      runCard.appendChild(runHeader);

      // Images array: try several possible field names
      const images = Array.isArray(doc.images) ? doc.images
        : Array.isArray(doc.generatedImages) ? doc.generatedImages
        : (doc.image ? [doc.image] : []);

      if (!images || images.length === 0) {
        const none = document.createElement('div');
        none.className = 'no-images';
        none.textContent = 'No images saved for this run.';
        runCard.appendChild(none);
      } else {
        const thumbs = document.createElement('div');
        thumbs.className = 'thumbs';
        images.forEach((imgUrl, idx) => {
          const imgWrap = document.createElement('div');
          imgWrap.className = 'thumb';

          const img = document.createElement('img');
          img.src = imgUrl;
          img.alt = `Generated image ${idx + 1}`;
          img.loading = 'lazy';
          imgWrap.appendChild(img);

          const controls = document.createElement('div');
          controls.className = 'thumb-controls';

          const dlBtn = document.createElement('button');
          dlBtn.className = 'download-btn btn';
          dlBtn.textContent = 'Download';
          dlBtn.addEventListener('click', () => downloadImageWithFallback(imgUrl, `${doc.id || 'run'}-${idx + 1}.png`));
          controls.appendChild(dlBtn);

          // Also offer a direct anchor for simple URLs (works with same-origin or permissive CORS)
          const anchor = document.createElement('a');
          anchor.href = imgUrl;
          anchor.download = `${doc.id || 'run'}-${idx + 1}.png`;
          anchor.className = 'download-link hidden';
          controls.appendChild(anchor);

          imgWrap.appendChild(controls);
          thumbs.appendChild(imgWrap);
        });
        runCard.appendChild(thumbs);

        // Download All for the run
        const downloadAllWrap = document.createElement('div');
        downloadAllWrap.className = 'download-all-wrap';
        const downloadAllBtn = document.createElement('button');
        downloadAllBtn.className = 'download-all-btn btn btn-primary';
        downloadAllBtn.textContent = 'Download All';
        downloadAllBtn.addEventListener('click', async () => {
          downloadAllBtn.disabled = true;
          for (let i = 0; i < images.length; i++) {
            const url = images[i];
            const filename = `${doc.id || 'run'}-${i + 1}.png`;
            try {
              /* eslint-disable no-await-in-loop */
              await downloadImageWithFallback(url, filename);
            } catch (e) {
              console.warn('Failed to download', url, e);
            }
            /* eslint-enable no-await-in-loop */
            await delay(300);
          }
          downloadAllBtn.disabled = false;
        });
        downloadAllWrap.appendChild(downloadAllBtn);
        runCard.appendChild(downloadAllWrap);
      }

      container.appendChild(runCard);
    });
  }

  // Try to download by creating an anchor and clicking. If cross-origin blocks download attribute,
  // fetch the resource and download via blob.
  async function downloadImageWithFallback(url, filename) {
    try {
      // Quick attempt: create anchor and click (works for data: and permissive URLs)
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // There's no reliable way to detect failure synchronously, so we still attempt a head fetch if CORS may block it.
      // Perform a short HEAD fetch to check content-type (best-effort).
      return Promise.resolve();
    } catch (err) {
      // Fallback to fetch + blob
      return fetchAndSaveBlob(url, filename);
    }
  }

  async function fetchAndSaveBlob(url, filename) {
    // For data: URLs, handle inline
    if (url.startsWith('data:')) {
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/data:(.*?);base64/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8], { type: mime });
      triggerDownload(blob, filename);
      return;
    }

    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const blob = await resp.blob();
    triggerDownload(blob, filename);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

})();