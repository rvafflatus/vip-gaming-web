// --- SUPABASE DIRECT API CORE CONNECTION ---
const SUPABASE_URL = "https://dyectpjxjigxcmoiafms.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // Keep your real anon key here

const dbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DatabaseEngine = {
    // 1. Fetch live showroom records sorted by latest submission
    async fetchAllVehicles() {
        const { data, error } = await dbClient
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // 2. Critical pipeline: Uploads image array elements one by one, returns safe asset URL strings
    async uploadVehiclePhotos(fileBufferPool) {
        let cleanPublicUrlArray = [];

        for (const file of fileBufferPool) {
            if (!file) continue; 
            
            const fileExtension = file.name.split('.').pop();
            const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;

            const { data, error: storageError } = await dbClient.storage
                .from('vehicle-photos')
                .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false });

            if (storageError) throw storageError;

            const { data: urlData } = dbClient.storage
                .from('vehicle-photos')
                .getPublicUrl(uniqueFileName);

            if (urlData?.publicUrl) {
                cleanPublicUrlArray.push(urlData.publicUrl);
            }
        }
        return cleanPublicUrlArray;
    },

    // 3. Inject text row metadata block to table rows matching schema constraints
    async insertVehicleRow(payloadData) {
        const { data, error } = await dbClient
            .from('vehicles')
            .insert([payloadData]);
        if (error) throw error;
        return data;
    },

    // 4. NEW: Delete a vehicle row by its unique ID
    async deleteVehicle(id) {
        const { data, error } = await dbClient
            .from('vehicles')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return data;
    }
};