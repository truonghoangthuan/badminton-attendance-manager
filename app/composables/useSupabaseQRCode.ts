export const useSupabaseQRCode = () => {
  const supabase = useSupabaseClient()
  const bucketName = 'qr-codes'

  const upload = async (file: File, uid: string) => {
    // 1. Prepare path
    const fileExt = file.name.split('.').pop()
    const filePath = `payment-qrs/${uid}.${fileExt}`

    // 2. Upload file (upsert: true overwrites if the name plus extension is the same)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw error
    }

    // 3. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return publicUrl
  }

  const remove = async (uid: string, currentUrl?: string) => {
    if (!currentUrl) return

    // Extract path from URL or just try to find the file
    // Since we know our path structure is payment-qrs/{uid}.{ext}
    // and we might not know the extension, we can try to parse the URL
    try {
      const url = new URL(currentUrl)
      const pathParts = url.pathname.split('/')
      // The path in publicUrl is usually .../public/qr-codes/payment-qrs/{uid}.ext
      const filePath = pathParts.slice(pathParts.indexOf(bucketName) + 1).join('/')
      
      if (filePath) {
        const { error } = await supabase.storage
          .from(bucketName)
          .remove([filePath])
        
        if (error) console.warn('Supabase delete warning:', error)
      }
    } catch (e) {
      console.error('Error parsing URL for deletion:', e)
    }
  }

  return {
    upload,
    remove
  }
}
