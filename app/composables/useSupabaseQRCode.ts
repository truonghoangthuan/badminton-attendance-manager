export const useSupabaseQRCode = () => {
  const supabase = useSupabaseClient()
  const bucketName = 'qr-codes'

  const upload = async (file: File, storageKey: string) => {
    const filePath = `payment-qrs/${storageKey}`

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return publicUrl
  }

  const remove = async (currentUrl?: string) => {
    if (!currentUrl) return

    try {
      const url = new URL(currentUrl)
      const pathParts = url.pathname.split('/')
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
