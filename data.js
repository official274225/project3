document.addEventListener('DOMContentLoaded', function () {
    async function loadFolderStructure() {
        try {
            const [commonRes, openRes] = await Promise.all([
                fetch("http://localhost:5000/api/folder?path=Common"),
                fetch("http://localhost:5000/api/folder?path=Open")
            ]);

            const commonContents = await commonRes.json();
            const openContents = await openRes.json();

            updateSidebar(commonContents, openContents);
            setupEventListeners();
        } catch (err) {
            console.error("Error loading folders:", err);
        }
    }

    function updateSidebar(commonContents, openContents) {
        const sidebar = document.querySelector('.category-list');
        let html = '';

        html += `
            <li class="category-parent" data-type="common">Common</li>
            <ul class="subfolder-list" id="common-subfolders">
                ${generateSubfolderItems(commonContents, 'Common')}
            </ul>
            <li class="category-parent" data-type="open">Open</li>
            <ul class="subfolder-list" id="open-subfolders">
                ${generateSubfolderItems(openContents, 'Open')}
            </ul>
        `;
        sidebar.innerHTML = html;
    }

    function generateSubfolderItems(contents, basePath) {
        let itemsHtml = '';
        contents.forEach(item => {
            if (item.type === 'directory') {
                itemsHtml += `
                    <li class="category-item folder"
                        data-title="${item.basename}"
                        data-path="${basePath}/${item.basename}">
                        ${item.basename}
                        <ul class="subfolder-list"></ul>
                    </li>
                `;
            }
        });
        return itemsHtml;
    }

    function setupEventListeners() {
        document.querySelectorAll('.category-parent').forEach(parent => {
            parent.addEventListener('click', function (e) {
                e.stopPropagation();
                const type = this.getAttribute('data-type');
                const subfolderList = document.getElementById(`${type}-subfolders`);
                this.classList.toggle('collapsed');
                subfolderList.classList.toggle('show');
            });
        });

        document.querySelector('.category-list').addEventListener('click', async function (e) {
            const folder = e.target.closest('.category-item.folder');
            if (!folder) return;

            const path = folder.getAttribute('data-path');
            const subList = folder.querySelector('.subfolder-list');
            subList.classList.toggle('show');

            if (folder.getAttribute('data-loaded') !== 'true') {
                try {
                    const res = await fetch(`http://localhost:5000/api/folder?path=${encodeURIComponent(path)}`);
                    const contents = await res.json();

                    let html = '';
                    contents.forEach(item => {
                        if (item.type === 'directory') {
                            html += `
                                <li class="category-item folder"
                                    data-title="${item.basename}"
                                    data-path="${path}/${item.basename}">
                                    ${item.basename}
                                    <ul class="subfolder-list"></ul>
                                </li>
                            `;
                        } else if (!folder.classList.contains('loaded-right')) {
                            const category = path.toLowerCase().includes('open') ? 'open' : 'common';
                            displayFolderContents(path.split('/').pop(), contents, category);
                            folder.classList.add('loaded-right');
                        }
                    });

                    subList.innerHTML = html;
                    folder.setAttribute('data-loaded', 'true');
                } catch (error) {
                    console.error('Error loading folder contents:', error);
                }
            }
        });

        document.getElementById('close-map-preview').addEventListener('click', function () {
            document.getElementById('data-page-container').style.display = 'flex';
            document.querySelector('.main-nav').style.display = 'block';
            document.getElementById('map-preview-section').style.display = 'none';
        });
    }

    function displayFolderContents(folderName, contents, category) {
        const dataList = document.getElementById('data-list');
        let html = '';
        const files = contents.filter(item => {
            const isGeoJSON = /\.(geojson|json)$/i.test(item.filename) && !/\.xml$/i.test(item.filename);
            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(item.filename);
            const isTiff = /\.(tif|tiff)$/i.test(item.filename);
            return isGeoJSON || isImage || isTiff;
        });

        files.forEach(item => {
            const isGeoJSON = item.filename.endsWith('.geojson');
            const icon = isGeoJSON ? '🗺️' : '📄';
            html += `
                <div class="data-card">
                    <div style="width: 160px; height: 120px; display: flex; align-items: center; justify-content: center; font-size: 3rem;">
                        ${icon}
                    </div>
                    <div class="data-info">
                        <h3>${item.basename}</h3>
                        <p>${isGeoJSON ? 'GeoJSON file' : 'Data file'}</p>
                        <div class="data-actions">
                            ${isGeoJSON ? `<a href="#" class="preview-link" data-file="${item.filename}">👁️ Preview</a>` : ''}
                            ${category === 'open' 
                                ? `<a href="http://localhost:5000/api/file?path=${encodeURIComponent(item.filename)}" download>💾 Download</a>`
                                : `<span class="disabled-download" title="Download is restricted to the Open category">💾 Download</span>`}

                            ${isGeoJSON ? `<a href="#" class="metadata-link" data-file="${item.filename}">📄 Metadata</a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        dataList.innerHTML = html;
        setupFileEventListeners();
    }

    function setupFileEventListeners() {
        document.querySelectorAll('.preview-link').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const filePath = this.getAttribute('data-file');
                previewFile(filePath);
            });
        });

        document.querySelectorAll('.metadata-link').forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const filePath = this.getAttribute('data-file');
                const txtPath = filePath.replace('.geojson', '.txt');

                window.open(`http://localhost:5000/api/metadata?path=${encodeURIComponent(txtPath)}`, '_blank');
            });
        });
    }

    function previewFile(filePath) {
        document.getElementById('data-page-container').style.display = 'none';
        document.querySelector('.main-nav').style.display = 'none';
        document.getElementById('map-preview-section').style.display = 'block';
        const iframe = document.getElementById('map-preview-iframe');
        iframe.src = '';
        setTimeout(() => {
            iframe.src = `search.html?file=${encodeURIComponent(filePath)}`;
        }, 50);
    }

    loadFolderStructure().then(() => {
        document.querySelector('[data-type="common"]').click();
    });
});
