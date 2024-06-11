/*
 * @Description: js-sdk for cess storage
 * @Autor: cess lab
 *
 */
const CHUNK_SIZE = 1024 * 1024;
export function download(url, savePath, log) {
  return new Promise(async (resolve, reject) => {
    try {
      log("Connecting …", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Operation: "download",
          Account: "cXh5StobuVP4B7mGH9xn8dSsDtXks4qLAou8ZdkZ6DbB6zzxe",
        },
        responseType: "blob",
      });
      let resData = await response.blob();
      savePath = savePath.split("\\").join("/");
      let fileName = savePath.split("/").slice(-1);
      fileName = fileName[0];
      saveFile(resData, fileName);
      resolve({ msg: "ok", data: savePath });
    } catch (e) {
      log(e);
      reject(e.message);
    }
  });
}
export async function upload(url, file, header, log, progressCb) {
  return new Promise((resolve, reject) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      log("uploading to ", url);

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      Object.keys(header).forEach((key) => {
        xhr.setRequestHeader(key, header[key]);
      });
      xhr.onload = function () {
        if (xhr.status === 200) {
          let data = xhr.response.split('"').join("");
          resolve({ msg: "ok", data });
        } else {
          reject(Error(xhr.statusText));
        }
      };
      xhr.onerror = function () {
        reject(Error("Network Error"));
      };
      if (progressCb && typeof progressCb == "function") {
        let stime = new Date().getTime();
        let sloaded = 0;
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) {
            let percentComplete = Math.ceil((e.loaded / e.total) * 100);
            let endTime = new Date().getTime();
            let dTime = (endTime - stime) / 1000;
            let dloaded = e.loaded - sloaded;
            let speed = dloaded / dTime;
            speed = speed / 1024;
            stime = new Date().getTime();
            sloaded = e.loaded;
            let speedUnit = "KB/s";
            if (speed > 1024) {
              speed = speed / 1024;
              speedUnit = "MB/s";
            }
            speed = speed.toFixed(1);
            progressCb({
              percentComplete,
              speed,
              speedUnit,
              xhr,
            });
          }
        };
      }
      xhr.send(formData);
    } catch (e) {
      log(e);
      reject(e.message);
    }
  });
}
export async function uploadWithChunk(url, file, header, log, progressCb) {
  let size = file.size;
  let state = "uploading";
  // 计算 当前分片的大小
  let chunkCount = Math.ceil(size / CHUNK_SIZE);
  header.BlockNumber = chunkCount;
  for (let i = 0; i < chunkCount; i++) {
    header.BlockIndex = i;
    if (state == 'abort') {
      return { msg: "abort" };
    }
    let start = i * CHUNK_SIZE;
    let end = start + CHUNK_SIZE;
    let stime = new Date().getTime();
    await postFile(url, file, header, start, end);
    if (!progressCb || typeof progressCb != "function") {
      continue;
    }
    let percentComplete = Math.ceil((i / chunkCount) * 100);
    let endTime = new Date().getTime();
    let dTime = (endTime - stime) / 1000;
    let speed = CHUNK_SIZE / dTime;
    speed = speed / 1024;
    let speedUnit = "KB/s";
    if (speed > 1024) {
      speed = speed / 1024;
      speedUnit = "MB/s";
    }
    speed = speed.toFixed(1);
    progressCb({
      percentComplete,
      speed,
      speedUnit,
      xhr: {
        abort: () => { state = 'abort'; }
      }
    });
  }
  return { msg: 'ok' };
}
function postFile(url, file, header, start, end) {
  return new Promise(async (resolve, reject) => {
    const blobFile = file.slice(start, end);
    const formData = new FormData();
    formData.append("file", blobFile);

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    Object.keys(header).forEach((key) => {
      xhr.setRequestHeader(key, header[key]);
    });
    xhr.onload = function () {
      if (xhr.status === 200) {
        let data = xhr.response.split('"').join("");
        resolve({ msg: "ok", data });
      } else {
        reject(Error(xhr.statusText));
      }
    };
    xhr.onerror = function () {
      reject(Error("Network Error"));
    };
    xhr.send(formData);
  });
}
function saveFile(blob, name) {
  // note: commented the following because `arrayBufferToBlob()` is not a valid function.
  if (!(blob instanceof Blob)) {
    blob = arrayBufferToBlob(blob);
  }
  // if (!blob) {
  //   return console.log("blob is null");
  // }
  if (typeof window != 'undefined') {
    let a = document.createElement("a");
    a.href = window?.URL?.createObjectURL(blob);//because window is null in the next.js
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window?.URL?.revokeObjectURL(blob);//because window is null in the next.js
  }
}