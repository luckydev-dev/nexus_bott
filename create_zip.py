import os
import zipfile

def create_app_zip():
    # We will generate both app_build.zip and app.zip to be thoroughly covered.
    for zip_filename in ['app_build.zip', 'app.zip']:
        print(f"Creating structured zip package '{zip_filename}' with 'dist' and contents of 'backend' at root...")
        
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Pack 'dist' folder (so it exists as dist/ inside the zip)
            dist_dir = 'dist'
            if os.path.exists(dist_dir):
                print(f"Packing frontend 'dist' folder into {zip_filename}...")
                for root, dirs, files in os.walk(dist_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Archive path starts with 'dist/'
                        archive_path = os.path.relpath(file_path, os.path.dirname(dist_dir))
                        zipf.write(file_path, archive_path)
            else:
                print("Warning: 'dist' folder not found.")
                
            # 2. Pack contents of 'backend' folder at the root level of the zip
            backend_dir = 'backend'
            if os.path.exists(backend_dir):
                print(f"Packing contents of 'backend' folder at root of {zip_filename}...")
                for root, dirs, files in os.walk(backend_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Archive path starts at the root of the backend folder
                        archive_path = os.path.relpath(file_path, backend_dir)
                        zipf.write(file_path, archive_path)
            else:
                print("Warning: 'backend' folder not found.")
                
        print(f"Zip package created successfully at {zip_filename}")

if __name__ == '__main__':
    create_app_zip()
