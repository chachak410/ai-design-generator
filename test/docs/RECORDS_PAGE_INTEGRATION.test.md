```html
<!-- INSERT into index.html (or the template that contains the records page) -->

<!-- 1) Add stylesheet in <head> (near other css links) -->
<link rel="stylesheet" href="css/records.css">

<!-- 2) Add records page HTML where your pages are defined -->
<section id="records-page" class="page hidden">
  <h2>Past Records</h2>
  <div class="records-container">
    <!-- The JS will inject the last 3 runs here -->
    <div id="records-last-runs"></div>
  </div>
</section>

<!-- 3) Include the script (after Firebase is initialized and after your other feature scripts) -->
<script src="js/features/records/history.js"></script>

<!-- 4) Hook initialization: when your app shows the 'records-page', call initRecordsPage()
Example: in your showPage('records-page') logic, add:
  if (pageId === 'records-page' && window.initRecordsPage) window.initRecordsPage();
-->