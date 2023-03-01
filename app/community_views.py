from app import app

#https://exploreflask.com/en/latest/configuration.html
#https://flask.palletsprojects.com/en/2.0.x/tutorial/layout/

import os
import flask
from flask import Flask, g, render_template, request, flash, jsonify, make_response, json
#from flask_sqlalchemy import SQLAlchemy
#from apregoar.models import Stories, UGazetteer, Instances, Users, EGazetteer, SpatialAssoc
from sqlalchemy import text
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from flask_table import Table, Col
import json
import geojson
import shapely.wkt as wkt
import shapely.wkb as wkb
import psycopg2
import pandas as pd
import datetime
from sqlalchemy import *
from sqlalchemy.orm import *
from geoalchemy2 import *
from geoalchemy2.shape import from_shape
import shapely
import shapely.wkt
#import osgeo.ogr
from shapely.geometry import Polygon, MultiPolygon
from flask import request, redirect, jsonify, make_response, render_template, session as fsession, redirect, url_for
from app import engine, session, text
from werkzeug.utils import secure_filename
from .publisher_views import get_user_stories, prep_story_vals

@app.route("/community/dashboard")
def community_dashboard():
   if not fsession.get("username") is None:
      user_stories = get_user_stories()
      print("user_stories:",user_stories)
      return render_template("community/dashboard.html", username=fsession["username"], uID = fsession["u_id"], userStories = user_stories)
   else:
      return redirect(url_for("sign_inU", login_source = "community"))

@app.route("/community/addstory")
def addstoryC():
    try:
        with engine.connect() as conn:
            SQL = text("SELECT * FROM apregoar.publication_info")
            result = conn.execute(SQL)
    except:
        print("Error in loading publisher info (community)")
        return render_template("community/dashboard.html", username=fsession["username"], uID = fsession["u_id"])
    else:
        publication_info = prep_story_vals(result)
    finally:
        conn.close()
    return render_template("publisher/create.html", publication_info = publication_info, channel  = "community")

@app.route("/community/review", methods=["GET","POST"])
def reviewC():
    return "We made it to reviewC!"