// --- GLOBAL APPLICATION STATE LAYER CONTROL MATRIX ---
let globalVehiclesArray = [];
let activeSelectedCategory = "All";
let memoryPhotoBuffer = [];
let isAdminLoggedIn = false; // Tracks if the admin is authenticated

const AppEngine = {
    // Initialize standard runtime parameters
    init() {
        lucide.createIcons();
        this.loadShowroomData();
        this.bindEvents();
        this.registerPWA();
    },

    // Sync state layout from database hook
    async loadShowroomData() {
        const grid = document.getElementById("showroomGrid");
        if (grid) {
            grid.innerHTML = `<div class="animate-pulse bg-[#1e293b] rounded-2xl h-80 border border-slate-800 col-span-full"></div>`;
        }
        
        try {
            globalVehiclesArray = await DatabaseEngine.fetchAllVehicles();
            this.renderShowroom();
            this.renderAdminManagementGrid(); // Dynamically populates the Edit tab too
        } catch (err) {
            console.error("Critical dashboard sync failure: ", err);
            if (grid) {
                grid.innerHTML = `<div class="col-span-full text-center text-red-400 p-6 font-bold">Failed loading data from Supabase.</div>`;
            }
        }
    },

    // Render cards array for the public storefront matching active filter conditions
    renderShowroom() {
        const grid = document.getElementById("showroomGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const visibleItems = globalVehiclesArray.filter(v => 
            activeSelectedCategory === "All" || v.category.toLowerCase() === activeSelectedCategory.toLowerCase()
        );

        if (visibleItems.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-12 text-lg font-medium">No inventory listed under this category.</div>`;
            return;
        }

        visibleItems.forEach(vehicle => {
            const thumb = vehicle.images?.[0] || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80";
            const card = document.createElement("div");
            card.className = "bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-md hover:border-slate-700/80 transition flex flex-col group cursor-pointer relative";
            
            card.onclick = () => this.openDrawer(vehicle.id);

            card.innerHTML = `
                <div class="relative aspect-video bg-slate-950 overflow-hidden">
                    <img src="${thumb}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                    <span class="absolute top-3 left-3 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md z-10">${vehicle.category}</span>
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 class="text-lg font-extrabold text-white tracking-tight line-clamp-1 group-hover:text-blue-400 transition">${vehicle.title}</h3>
                        <p class="text-sm text-slate-400 flex items-center gap-1 mt-1"><i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-500"></i> ${vehicle.location}</p>
                    </div>
                    <div class="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span class="text-xl font-black text-white">${vehicle.price}</span>
                        <span class="text-sm text-blue-500 font-bold flex items-center gap-0.5">View Specs <i data-lucide="chevron-right" class="w-4 h-4"></i></span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();
    },

    // NEW: Renders the backend inventory list inside your "Edit Old Listings" tab matrix
    renderAdminManagementGrid() {
        const adminGrid = document.getElementById("adminManagementGrid");
        if (!adminGrid) return;
        adminGrid.innerHTML = "";

        if (globalVehiclesArray.length === 0) {
            adminGrid.innerHTML = `<div class="col-span-full text-center text-slate-500 py-6">No listings available to manage.</div>`;
            return;
        }

        globalVehiclesArray.forEach(vehicle => {
            const thumb = vehicle.images?.[0] || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80";
            const card = document.createElement("div");
            card.className = "bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden p-4 flex items-center justify-between gap-4 relative";
            
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <img src="${thumb}" class="w-16 h-16 object-cover rounded-xl border border-slate-800 flex-shrink-0">
                    <div>
                        <h4 class="font-bold text-white text-base line-clamp-1">${vehicle.title}</h4>
                        <p class="text-xs text-blue-400 font-semibold">${vehicle.category} • ${vehicle.price}</p>
                    </div>
                </div>
                <button type="button" onclick="AppEngine.handleDeleteListing('${vehicle.id}', '${vehicle.title.replace(/'/g, "\\'")}')" class="p-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition cursor-pointer">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            `;
            adminGrid.appendChild(card);
        });
        lucide.createIcons();
    },

    // NEW: Clean handling architecture for switching between View A and View B tabs
    switchAdminTab(tabName) {
        const tabEdit = document.getElementById("tabEditListings");
        const tabAdd = document.getElementById("tabAddNewVehicle");
        const viewEdit = document.getElementById("adminViewEdit");
        const formAdd = document.getElementById("vehicleForm");

        if (tabName === 'edit') {
            viewEdit.classList.remove("hidden");
            formAdd.classList.add("hidden");
            tabEdit.className = "flex-1 py-4 text-center font-bold text-base rounded-xl transition cursor-pointer flex items-center justify-center gap-2 bg-blue-600 text-white";
            tabAdd.className = "flex-1 py-4 text-center font-bold text-base rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-slate-400 hover:text-white";
        } else {
            viewEdit.classList.add("hidden");
            formAdd.classList.remove("hidden");
            tabEdit.className = "flex-1 py-4 text-center font-bold text-base rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-slate-400 hover:text-white";
            tabAdd.className = "flex-1 py-4 text-center font-bold text-base rounded-xl transition cursor-pointer flex items-center justify-center gap-2 bg-blue-600 text-white";
        }
    },

    filterCategory(category) {
        activeSelectedCategory = category;
        document.querySelectorAll(".category-chip").forEach(btn => {
            btn.classList.remove("bg-blue-600", "text-white");
            btn.classList.add("bg-slate-800", "text-slate-300");
        });
        event.currentTarget.classList.remove("bg-slate-800", "text-slate-300");
        event.currentTarget.classList.add("bg-blue-600", "text-white");
        this.renderShowroom();
    },

    openDrawer(id) {
        const item = globalVehiclesArray.find(v => v.id === id);
        if (!item) return;

        const container = document.getElementById("drawerContent");
        let carousel = `<div class="w-full flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory rounded-xl bg-slate-950">`;
        (item.images || []).forEach((img, index) => {
            carousel += `<div class="w-full aspect-video flex-shrink-0 snap-start"><img src="${img}" class="w-full h-full object-contain"></div>`;
        });
        carousel += `</div>`;

        container.innerHTML = `
            ${carousel}
            <div class="space-y-2">
                <h2 class="text-2xl font-black text-white tracking-tight">${item.title}</h2>
                <div class="flex gap-2"><span class="text-2xl font-black text-blue-400">${item.price}</span></div>
            </div>
            <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-4 text-sm space-y-3">
                <div class="flex justify-between"><span class="text-slate-400 font-medium">Owner</span><span class="text-white font-bold">${item.owner}</span></div>
                <div class="flex justify-between"><span class="text-slate-400 font-medium">Year</span><span class="text-white font-bold">${item.year}</span></div>
                <div class="flex justify-between"><span class="text-slate-400 font-medium">Yard Location</span><span class="text-white font-bold">${item.location}</span></div>
            </div>
            <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Dealership Description</h4>
                <p class="text-base text-slate-300 bg-[#0f172a] p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed">${item.description}</p>
            </div>
            <a href="https://wa.me/919999999999?text=Hello%20Mansoori%20Auto%20World,%20I%20am%20interested%20in%20your%20listed%20asset:%20${encodeURIComponent(item.title)}." target="_blank" class="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-bold text-base flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-600/10">Contact on WhatsApp</a>
        `;

        document.getElementById("detailDrawer").classList.remove("pointer-events-none");
        document.getElementById("drawerBackdrop").classList.add("opacity-100", "pointer-events-auto");
        document.getElementById("detailDrawer").querySelector(".absolute.top-0.right-0").classList.remove("translate-x-full");
        lucide.createIcons();
    },

    closeDrawer() {
        document.getElementById("detailDrawer").classList.add("pointer-events-none");
        document.getElementById("drawerBackdrop").classList.remove("opacity-100", "pointer-events-auto");
        const panel = document.getElementById("detailDrawer").querySelector(".absolute.top-0.right-0");
        if (panel) panel.classList.add("translate-x-full");
    },

    async handleDeleteListing(id, title) {
        const confirmation = confirm(`Are you sure you want to permanently delete "${title}"?`);
        if (!confirmation) return;

        try {
            await DatabaseEngine.deleteVehicle(id);
            alert("Listing successfully deleted.");
            this.loadShowroomData(); // Refreshes both UI layers dynamically
        } catch (err) {
            alert(`Failed to delete listing: ${err.message}`);
        }
    },

    bindEvents() {
        document.getElementById("closeDrawerBtn").onclick = () => this.closeDrawer();
        document.getElementById("drawerBackdrop").onclick = () => this.closeDrawer();

        document.getElementById("officeLoginBtn").onclick = () => {
            document.getElementById("adminModal").classList.remove("hidden");
            if (isAdminLoggedIn) {
                document.getElementById("adminAuthBox").classList.add("hidden");
                document.getElementById("adminWorkspace").classList.remove("hidden");
                this.switchAdminTab('edit'); // Resets to the dashboard inventory layout
            } else {
                document.getElementById("adminAuthBox").classList.remove("hidden");
                document.getElementById("adminWorkspace").classList.add("hidden");
            }
        };

        document.getElementById("closeAdminBtn").onclick = () => {
            document.getElementById("adminModal").classList.add("hidden");
            isAdminLoggedIn = false; // Log out upon closing panel window context for consumer mode safety
            this.loadShowroomData();
        };

        document.getElementById("submitAuthBtn").onclick = () => {
            if (document.getElementById("authId").value === "admin" && document.getElementById("authPass").value === "vip786") {
                isAdminLoggedIn = true;
                document.getElementById("adminAuthBox").classList.add("hidden");
                document.getElementById("adminWorkspace").classList.remove("hidden");
                this.switchAdminTab('edit');
                this.renderAdminManagementGrid();
            } else {
                alert("Incorrect Identity Verification credentials.");
            }
        };

        document.getElementById("photoFilesInput").onchange = (e) => {
            const files = Array.from(e.target.files);
            if ((memoryPhotoBuffer.length + files.length) > 10) {
                alert("Maximum upload allowance capped at 10 assets.");
                return;
            }
            files.forEach(file => {
                memoryPhotoBuffer.push(file);
                const idx = memoryPhotoBuffer.length - 1;
                const blob = URL.createObjectURL(file);
                
                const node = document.createElement("div");
                node.className = "relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group";
                node.id = `prev-node-${idx}`;
                node.innerHTML = `
                    <img src="${blob}" class="w-full h-full object-cover">
                    <button type="button" onclick="AppEngine.removeImg(${idx})" class="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                `;
                document.getElementById("filePreviewDeck").appendChild(node);
            });
            lucide.createIcons();
        };

        document.getElementById("vehicleForm").onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById("submitFormBtn");
            const originalText = btn.innerHTML;
            const validPhotos = memoryPhotoBuffer.filter(f => f !== null);

            if (validPhotos.length === 0) {
                alert("Please add at least 1 image file asset.");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Processing Upload Pipeline...`;
            lucide.createIcons();

            try {
                const imageUrlStrings = await DatabaseEngine.uploadVehiclePhotos(validPhotos);

                const payload = {
                    title: document.getElementById("formTitle").value,
                    category: document.getElementById("formCategory").value,
                    price: document.getElementById("formPrice").value,
                    year: document.getElementById("formYear").value,
                    owner: document.getElementById("formOwner").value,
                    location: document.getElementById("formLocation").value,
                    description: document.getElementById("formDescription").value,
                    secret_name: document.getElementById("formSecretName").value || null,
                    secret_phone: document.getElementById("formSecretPhone").value || null,
                    images: imageUrlStrings
                };

                await DatabaseEngine.insertVehicleRow(payload);
                alert("Asset has been successfully published!");
                
                document.getElementById("vehicleForm").reset();
                document.getElementById("filePreviewDeck").innerHTML = "";
                memoryPhotoBuffer = [];
                document.getElementById("adminModal").classList.add("hidden");
                isAdminLoggedIn = false;
                this.loadShowroomData();
            } catch (err) {
                alert(`Pipeline rejection error: ${err.message}`);
                btn.disabled = false;
                btn.innerHTML = originalText;
                lucide.createIcons();
            }
        };
    },

    removeImg(idx) {
        memoryPhotoBuffer[idx] = null;
        const node = document.getElementById(`prev-node-${idx}`);
        if (node) node.remove();
    },

    registerPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW Registration failed", err));
        }
    }
};

// Start Runtime Engine Core Execution
document.addEventListener("DOMContentLoaded", () => AppEngine.init());