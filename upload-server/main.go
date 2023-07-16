package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

// Compile templates on start of the application
//var templates = template.Must(template.ParseFiles("public/upload.html"))

// Display the named template
// func display(w http.ResponseWriter, page string, data interface{}) {
// 	templates.ExecuteTemplate(w, page+".html", data)
// }

func uploadFile(w http.ResponseWriter, r *http.Request) {

	// Maximum upload of 10 MB files
	err := r.ParseMultipartForm(32 << 20)
	if err != nil {
		fmt.Fprintln(w, err)
		return
	}
	formdata := r.MultipartForm
	//get the *fileheaders
	files := formdata.File["files"] // grab the filenames

	for i, _ := range files { // loop through the files one by one

		file, err := files[i].Open()
		defer file.Close()
		if err != nil {
			fmt.Fprintln(w, err)
			return
		}

		out, err := os.Create("uploads/" + files[i].Filename)
		if err != nil {
			fmt.Fprintln(w, err)
			return
		}
		defer out.Close()
		if err != nil {
			fmt.Fprintf(w, "Unable to create the file for writing. Check your write access privilege")
			return
		}

		_, err = io.Copy(out, file) // file not files[i] !

		if err != nil {
			fmt.Fprintln(w, err)
			return
		}

		fmt.Fprintf(w, "Files uploaded successfully : ")
		fmt.Fprintf(w, files[i].Filename+"\n")

	}
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	uploadFile(w, r)
	// switch r.Method {
	// case "GET":
	// 	display(w, "upload", nil)
	// case "POST":
	// 	uploadFile(w, r)
	// }
}

func main() {
	// Upload route
	http.HandleFunc("/upload", uploadHandler)

	//Listen on port 8080
	http.ListenAndServe(":8080", nil)
}
