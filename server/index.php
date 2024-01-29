<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
<script>
    let formData = new FormData();
    formData.append("file_size", "100")
    fetch("http://localhost:7777/ask_permission_upload_recording.php", {
        body: formData,
        method: "POST"
    })
    .then((res) => {
        console.log(res);
        return res.json();
    })
    .then((json) => {
        console.log(json);
    })
</script>
</html>