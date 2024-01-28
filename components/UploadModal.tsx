'use client'

import useUploadModal from '@/hooks/useUploadModal'
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import uniqid from 'uniqid'
import { useUser } from '@/hooks/useUser'
import { useState } from 'react'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'

const uploadModal = () => {
  const [isLoading, setIsLoading] = useState(false)
  const uploadModal = useUploadModal()
  const { user } = useUser()
  const supabaseClient = useSupabaseClient()
  const router = useRouter();

  const { register, handleSubmit, reset } = useForm<FieldValues>({
    defaultValues: {
      author: '',
      title: '',
      song: null,
      image: null
    }
  })

  const onsubmit: SubmitHandler<FieldValues> = async values => {
    // Upload to supabase
    try {
      const imageFile = values.image?.[0]
      const songFile = values.song?.[0]

      if (!imageFile || !songFile || !user) {
        toast.error('Missing fields.')
        return
      }

      const uniqueId = uniqid()

      // Upload songs
      const { data: songData, error: songError } = await supabaseClient.storage
        .from('songs')
        .upload(`song-${values.title}-${uniqueId}`, songFile, {
          cacheControl: '3600',
          upsert: false
        });

        if(songError){
          setIsLoading(false);
          return toast.error('Failed to upload your song.')
        }

        // Upload Image
      const { data: imageData, error: imageError } = await supabaseClient.storage
        .from('images')
        .upload(`image-${values.title}-${uniqueId}`, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

        if(imageError){
          setIsLoading(false);
          return toast.error('Failed to upload your image.')
        }

        // inserting data to supabase database
        const {
          error: supabaseError
        } = await supabaseClient.from('songs').insert({
          user_id: user.id,
          title: values.title,
          author: values.author,
          image_path: imageData.path,
          songs_path: songData.path
        });

        if(supabaseError){
          setIsLoading(false)
          return toast.error(supabaseError.message);
        }

        router.refresh();
        setIsLoading(false);
        toast.success('Song Uploaded!');
        reset();
        uploadModal.onClose();

    } catch (error) {
      toast.error('Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  const onChange = (open: boolean) => {
    if (!open) {
      reset()
      uploadModal.onClose()
    }
  }

  return (
    <Modal
      title='Add a song'
      description='Upload an mp3 file'
      isOpen={uploadModal.isOpen}
      onChange={onChange}
    >
      <form
        onSubmit={handleSubmit(onsubmit)}
        className='flex flex-col gap-y-4'
      >
        <Input
          id='title'
          disabled={isLoading}
          {...register('title', { required: true })}
          placeholder='Song title'
        />

        <Input
          id='author'
          disabled={isLoading}
          {...register('author', { required: true })}
          placeholder='Song author'
        />

        <div>
          <div className='pb-1'>Select a song file</div>
          <Input
            id='song'
            type='file'
            disabled={isLoading}
            accept='.mp3'
            {...register('song', { required: true })}
          />
        </div>
        <div>
          <div className='pb-1'>Select a image file</div>
          <Input
            id='image'
            type='file'
            disabled={isLoading}
            accept='image/*'
            {...register('image', { required: true })}
          />
        </div>
        <Button disabled={isLoading} type='submit'>
          Create
        </Button>
      </form>
    </Modal>
  )
}

export default uploadModal
