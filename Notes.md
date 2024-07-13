while using this app in local environment make sure to add followings

1. Your `app password` in the pass key in auth.js controller (to know about `app password` go [here](https://support.google.com/accounts/answer/185833))

2. Your Email where ever you see mine.

3. your mongo db URI in `app.js`

### npm install multer

we use multer in app middleware
`multer()` function returns a Multer instance that provides several methods for generating middleware that process files uploaded in multipart/form-data format.

The `StorageEngine` specified in `storage` will be used to store files. If storage is not set and `dest` is, files will be stored in `dest` on the local file system with random names. If neither are set, files will be stored in memory.

from different one method is `single()` which
Returns middleware that processes a single file associated with the given form field.
The `Request` object will be populated with a `file` object containing information about the processed file.
The argument of single is the name field you setted in form for that image input.
