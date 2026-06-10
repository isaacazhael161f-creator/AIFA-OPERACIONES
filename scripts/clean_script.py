import os

def clean_script_js():
    file_path = os.path.join(os.path.dirname(__file__), '..', 'script.js')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the index of "// End of script"
    end_index = -1
    for i in range(len(lines) - 1, -1, -1):
        if "// End of script" in lines[i]:
            end_index = i
            break
    
    if end_index != -1:
        print(f"Found '// End of script' at line {end_index + 1}. Truncating file...")
        # Keep lines up to end_index + 1 (to include the line itself)
        clean_lines = lines[:end_index + 1]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(clean_lines)
        print("File cleaned.")
    else:
        print("'// End of script' not found.")

if __name__ == "__main__":
    clean_script_js()
