import firebase_admin
from firebase_admin import credentials
from firebase_admin import storage

cred = credentials.Certificate('credentials.json')
firebase_admin.initialize_app(cred, {
    'storageBucket': 'sydfortport.firebasestorage.app'
})

bucket = storage.bucket()
bucket.cors = [{
    'origin': ['*'],
    'method': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'maxAgeSeconds': 3600,
    'responseHeader': ['Content-Type', 'Authorization']
}]
bucket.update()
print('CORS')
