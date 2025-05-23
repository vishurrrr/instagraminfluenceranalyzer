let savedProfiles = [];
let followMap = {};

function searchUser() {
  const username = $("#searchBox").val().trim();
  if (!username) return showError("Please enter an Instagram username.");
  hideError();
  $("#result").html("Searching...");
  fetch(`/search?q=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        return showError(`${data.error}`);
      }
      const card = `
        <div class="card mx-auto" id="profileCard" style="cursor:pointer;">
          <span class="remove-btn" onclick="$('#result').empty(); event.stopPropagation();">×</span>
          <img src="/profile_pic?url=${encodeURIComponent(data.profile_pic_url)}" class="rounded-circle mx-auto d-block mt-3" width="70" height="70">
          <h6 class="text-center mt-2">@${data.username}</h6>
          <p class="text-center small mb-1">Followers: ${data.followers}<br>Following: ${data.following}<br>Posts: ${data.total_posts}</p>
          <p class="text-center small text-center">${data.bio || ""}</p>
        </div>`;
      $("#result").html(card);
      $("#profileCard").click(() => {
        saveProfile(data);
        $("#searchBox").val("");
        $("#result").empty();
      });
    }).catch(() => {
      $("#result").html('<div class="alert alert-danger">Error fetching data. Try again.</div>');
    });
}

function clearAll() {
  $("#searchBox").val("");
  $("#result").empty();
  savedProfiles = [];
  followMap = {};
  renderSavedProfiles();
  $("#rankingResult").empty();
  hideError();
}

function saveProfile(profile) {
  if (savedProfiles.length >= 10) return showError("You can save up to 10 profiles only.");
  if (savedProfiles.find(p => p.username === profile.username)) return showError("This profile is already saved.");
  hideError();
  savedProfiles.push(profile);
  if (!(profile.username in followMap)) {
    followMap[profile.username] = [];
  }
  renderSavedProfiles();
}

function removeProfile(username) {
  savedProfiles = savedProfiles.filter(p => p.username !== username);
  delete followMap[username];
  for (let key in followMap) {
    followMap[key] = followMap[key].filter(f => f !== username);
  }
  renderSavedProfiles();
}

function renderSavedProfiles() {
  $("#savedProfiles").empty();
  savedProfiles.forEach(p => {
    const value = (followMap[p.username] || []).join(", ");
    const card = $(`
      <div class="card text-center p-2 d-flex flex-column" style="height: 320px; width: 200px;">
        <span class="remove-btn align-self-end" onclick="removeProfile('${p.username}')">×</span>
        <img src="/profile_pic?url=${encodeURIComponent(p.profile_pic_url)}" class="rounded-circle mx-auto d-block mt-2" width="60" height="60">
        <h6 class="mt-2">@${p.username}</h6>
        <p class="small mb-1">Followers: ${p.followers}<br>Following: ${p.following}<br>Posts: ${p.total_posts}</p>
        <p class="small">${p.bio || ""}</p>
        
        <!-- This pushes the input to the bottom -->
        <div class="mt-auto w-100">
          <label class="form-label text-light small mt-2 mb-1">Follows:</label>
          <input type="text" id="follows-${p.username}" class="form-control form-control-sm" value="${value}" placeholder="e.g. user2, user3">
        </div>
      </div>
    `);
    
    $("#savedProfiles").append(card);
    $(`#follows-${p.username}`).on("input", function () {
      const inputVal = $(this).val();
      const usernames = inputVal.split(",").map(u => u.trim()).filter(u => u.length && u !== p.username);
      followMap[p.username] = usernames;
    });
  });
}

function analyzeInfluencers() {
  if (savedProfiles.length < 1) return showError("Please add at least one profile to analyze.");
  hideError();
  const algo = $("#algorithmSelect").val();
  const payload = {
    algorithm: algo,
    profiles: savedProfiles,
    follows: followMap
  };
  $("#rankingResult").html("Analyzing...");
  fetch("/analyze", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      return $("#rankingResult").html(`<div class="alert alert-danger">${data.error}</div>`);
    }
    let html = '<h4 class="text-center mb-3 text-light">Influencer Rankings</h4><div class="d-flex flex-wrap justify-content-center gap-3">';
    data.forEach((p, i) => {
      html += `
        <div class="card text-center p-3">
          <h5>#${i + 1}</h5>
          <img src="/profile_pic?url=${encodeURIComponent(p.profile_pic_url)}" width="60" height="60" class="rounded-circle mb-2">
          <h6>@${p.username}</h6>
          <p class="small">Followers: ${p.followers}<br>Following: ${p.following}<br>Posts: ${p.total_posts}<br><strong>Score:</strong> ${p.score}</p>
          <p class="small">${p.bio || ""}</p>
        </div>`;
    });
    html += '</div>';
    $("#rankingResult").html(html);
    document.getElementById("rankingResult").scrollIntoView({ behavior: 'smooth' });
    document.getElementById("emojiBackground").innerHTML = "";
    createFloatingEmojis();
  }).catch(() => {
    $("#rankingResult").html('<div class="alert alert-danger">Error during analysis.</div>');
  });
}


function showError(message) {
  $("#errorMessage").text(message);
  $("#errorAlert").removeClass("d-none");
}

function hideError() {
  $("#errorAlert").addClass("d-none");
}

function showError(message) {
  const alertHtml = `
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  $("#result").html(alertHtml);
}